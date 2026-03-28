# Guia do Professor — Doki Doki Garrafão Club

Este documento é um guia de apoio para educadores que queiram usar o jogo em sala de aula. Contém spoilers completos da narrativa, as decisões disponíveis, os conceitos técnicos abordados em cada fase e os critérios dos finais.

---

## Narrativa

O jogador é contratado por uma startup para criar um sistema de controle do garrafão d'água do escritório. A chefe quer saber quem bebe, quem enche e quem é o culpado quando o garrafão acaba. Ao longo do jogo, problemas reais surgem como consequência das escolhas de modelagem feitas nas fases anteriores, culminando em uma investigação final sobre quem esvaziou o garrafão.

---

## Fases e Decisões

### FASE 1 — Chave Primária

**Contexto:** O jogador precisa definir a chave primária da tabela `pessoa`.

**Opções:**
| Opção | Conceito ensinado |
|-------|-------------------|
| CPF | FK natural, dados sensíveis como PK, risco de migração em cascata |
| ID (surrogate) | Chave substituta, imutabilidade da PK, separação entre identificador de negócio e técnico |

**Impacto no jogo:** Se o jogador escolher CPF, na FASE 5 a empresa anuncia um novo formato de CPF com prefixo de país (`BR-123...`). A migração exige `SET FOREIGN_KEY_CHECKS = 0` no MySQL e atualização em cascata de todas as tabelas filhas. Se escolher ID, a migração é trivial — apenas um `UPDATE` na tabela `pessoa`.

**Conceitos abordados:** chave primária, chave estrangeira, dados mutáveis como PK, migração de dados, constraints no MySQL.

---

### FASE 2 — Rastreamento de Nível

**Contexto:** O sistema precisa saber o nível atual de água do garrafão a qualquer momento.

**Opções:**
| Opção | Descrição | Problema introduzido |
|-------|-----------|----------------------|
| Via consulta | Calcula somando abastecimentos e subtraindo consumos | Lentidão com volume alto de registros |
| Tabela snapshot | Tabela separada com registro do litro a cada operação | Inconsistência se alguém inserir direto no banco sem usar a aplicação |
| litro_atual no garrafão | Coluna na tabela do garrafão atualizada a cada operação | Inconsistência se o valor for editado diretamente no banco |

**Impacto no jogo:** Na FASE 3, um bug de inconsistência surge. A natureza do erro e a solução sugerida variam conforme a escolha feita aqui. O jogo sugere o uso de **triggers** como solução para as opções Snapshot e Coluna.

**Impacto na FASE 6:** A escolha do rastreamento determina a complexidade da query final para descobrir quem esvaziou o garrafão. Snapshot permite uma consulta direta; as demais exigem uma subquery correlacionada calculando o saldo operação por operação.

**Conceitos abordados:** desnormalização, consistência de dados, triggers, performance de queries, trade-offs de design.

---

### FASE 3 — Bug de Inconsistência

**Contexto:** O sistema apresenta dados incorretos sobre o nível do garrafão.

A chefe fica irritada. O sistema explica o problema específico com base na escolha da FASE 2 e sugere o uso de um trigger para garantir a integridade automaticamente.

**Conceitos abordados:** integridade referencial, triggers, consequências de edição direta no banco.

---

### FASE 4 — Métrica do Ranking

**Contexto:** A chefe quer um ranking público de quem mais contribui para o garrafão.

O jogador analisa três SQLs candidatos em um formato de decisão interativo — cada SQL é apresentado um por vez e o jogador decide se resolve o problema.

**SQLs candidatos:**
| Label | Métrica | Correto? |
|-------|---------|----------|
| Frequência | `COUNT(*)` de abastecimentos | Tecnicamente funciona, mas pode ser manipulado |
| Consumo invertido | `COUNT(*)` de consumos | Errado — premia quem mais bebe, não quem mais enche |
| Volume | `SUM(litros)` de abastecimentos | Correto e resistente a manipulação |

**Impacto no jogo:** Se o jogador escolher Frequência, a história mostra Joãozinho abastecendo 200ml várias vezes ao dia para subir no ranking — o sistema foi manipulado. A chefe descobre e exige a correção. Se escolher Volume, Maria é premiada corretamente.

**Conceitos abordados:** modelagem de métricas, semântica de queries, GROUP BY, agregações, vulnerabilidade a gaming de sistemas.

---

### FASE 5 — Migração de CPF

**Contexto:** A empresa fecha uma parceria internacional e o RH adota um novo formato de CPF com prefixo de país.

Esta fase é narrativa/educacional — não há decisão de ramificação, apenas a consequência da escolha da FASE 1:

- **ID como PK:** migração trivial, chefe satisfeita.
- **CPF como PK:** o jogador precisa identificar o horário de menor movimento no banco para executar a migração com menor impacto, desativar temporariamente as foreign key checks do MySQL e atualizar todas as tabelas em cascata dentro de uma transação.

**Query ensinada (horário de menor tráfego):**
```sql
SELECT HOUR(created_at) AS hora,
       COUNT(*) AS total_operacoes
FROM consumo
WHERE garrafao_id = 1
GROUP BY hora
ORDER BY total_operacoes ASC
LIMIT 3;
```

**Transação ensinada:**
```sql
SET FOREIGN_KEY_CHECKS = 0;
BEGIN;
  UPDATE pessoa SET cpf = CONCAT('BR-', cpf);
  UPDATE consumo SET pessoa_cpf = CONCAT('BR-', pessoa_cpf);
  UPDATE abastecimento SET pessoa_cpf = CONCAT('BR-', pessoa_cpf);
COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
```

**Conceitos abordados:** foreign key constraints no MySQL (verificação por statement, não por transação), transações, rollback, manutenção de banco em produção.

---

### FASE 6 — Quem Esvaziou o Garrafão?

**Contexto:** O garrafão zerou às 14h e ninguém encheu. A chefe quer saber quem foi o último a beber.

A query necessária depende diretamente da escolha de rastreamento da FASE 2:

**Snapshot:**
```sql
SELECT p.nome, c.created_at, c.litros
FROM garrafao_snapshot s
JOIN consumo c
  ON c.garrafao_id = s.garrafao_id
 AND c.created_at = s.registrado_em
JOIN pessoa p ON p.id = c.pessoa_id
WHERE s.garrafao_id = 1
  AND s.litro_atual = 0
ORDER BY s.registrado_em DESC
LIMIT 1
```

**Consulta / Coluna (subquery correlacionada):**
```sql
SELECT p.nome, c.created_at, c.litros
FROM consumo c
JOIN pessoa p ON p.id = c.pessoa_id
WHERE c.garrafao_id = 1
  AND (
    SELECT COALESCE(SUM(a.litros), 0)
    FROM abastecimento a
    WHERE a.garrafao_id = 1 AND a.created_at <= c.created_at
  ) - (
    SELECT COALESCE(SUM(c2.litros), 0)
    FROM consumo c2
    WHERE c2.garrafao_id = 1 AND c2.created_at <= c.created_at
  ) <= 0
ORDER BY c.created_at ASC
LIMIT 1
```

Se o jogador não usou snapshot, a chefe reclama que a query demorou 8 segundos.

**Conceitos abordados:** subqueries correlacionadas, COALESCE, trade-off entre snapshot e cálculo em tempo real, performance.

---

### FASE 7 — Média de Consumo

**Contexto:** A chefe quer saber quem consome mais por vez — não o total acumulado, mas a média por consumo.

O jogador analisa quatro SQLs candidatos:

| Label | SQL | Comportamento |
|-------|-----|---------------|
| AVG sem GROUP BY | `AVG(litros)` sem GROUP BY | Bloqueado — erro explicado |
| GROUP BY só por nome | `AVG` com `GROUP BY p.nome` | Prossegue, chefe descobre o erro |
| Total ÷ nº de pessoas | `SUM / (SELECT COUNT(*) FROM pessoa)` | Prossegue, chefe descobre o erro |
| AVG por pessoa | `AVG` com `GROUP BY p.id, p.nome` | Correto |

Para os dois SQLs que prosseguem com erro, a chefe descobre o problema na narrativa:
- **Total ÷ pessoas:** "A média da Ana caiu quando contratei dois estagiários. Isso faz sentido?"
- **GROUP BY nome:** "O sistema agrupou a Ana e a Ana Clara como uma pessoa só."

**Conceitos abordados:** AVG, GROUP BY, unicidade de agrupamento, ONLY_FULL_GROUP_BY do MySQL, diferença entre média aritmética e média ponderada por registros.

---

## Finais

O final é determinado pela combinação de duas variáveis:

**Decisões estruturais boas** = `pk = 'ID'` E `tracking = 'Snapshot'` E `ranking = 'Volume'`

**Query final correta** = escolheu `'AVG por pessoa'` na FASE 7

| Decisões | Query final | Final |
|----------|-------------|-------|
| Boas | Correta | **Aumento** — chefe elogia e promove |
| Ruins | Correta | **Podia Ser Pior** — chefe reconhece o acerto tardio |
| Boas | Errada | **Tão Perto...** — chefe oferece "um garrafão de café" em tom humorístico |
| Ruins | Errada | **Demitido** — "Você está demitido. Mas o garrafão fica." |

---

## Sugestões de uso em sala

- **Antes de jogar:** discutir com os alunos o que é uma chave primária e por que a escolha importa.
- **Durante:** pausar nas telas de decisão para debater as opções em grupo antes de escolher.
- **Depois:** comparar os finais obtidos por alunos diferentes e discutir por que cada caminho levou a cada resultado.
- **Foco especial:** a FASE 5 (migração de CPF) é especialmente rica para turmas que já viram transações e constraints, pois mostra um problema real que surgiu de uma decisão tomada lá atrás.
