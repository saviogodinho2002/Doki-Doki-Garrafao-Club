/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import mermaid from 'mermaid';
import {
  Play,
  RotateCcw,
  Settings,
  ChevronRight,
  Database,
  AlertCircle,
  CheckCircle2,
  Code2,
  Trophy,
  History,
  X
} from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#1e1b4b',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#6366f1',
    lineColor: '#ec4899',
    secondaryColor: '#0f172a',
    tertiaryColor: '#1e293b',
    background: '#0f172a',
    mainBkg: '#1e1b4b',
    nodeBorder: '#6366f1',
    clusterBkg: '#1e293b',
    titleColor: '#f9a8d4',
    edgeLabelBackground: '#0f172a',
    attributeBackgroundColorEven: '#1e1b4b',
    attributeBackgroundColorOdd: '#0f172a',
  },
  er: {
    diagramPadding: 20,
    layoutDirection: 'TB',
    minEntityWidth: 120,
    minEntityHeight: 50,
    entityPadding: 15,
    useMaxWidth: true,
  },
});

import computerImg from './computer.png';
import bossNeutralImg from './confiante_wf.png';
import officeImg from './escritorio.jpg';
import bossHappyImg from './happy_wf.png';
import bossAngryImg from './irritada_wf.png';

const IMAGES = {
  COMPUTER_BLUR: computerImg,
  BOSS_NEUTRAL: bossNeutralImg,
  OFFICE: officeImg,
  BOSS_HAPPY: bossHappyImg,
  BOSS_ANGRY: bossAngryImg,
};

type Mood = 'neutral' | 'happy' | 'angry';

interface Decision {
  id: string;
  label: string;
  choice: string;
  impact: string;
}

interface GameState {
  step: number;
  phase: 'MENU' | 'PROLOGUE' | 'FASE_1' | 'FASE_2' | 'FASE_3' | 'FASE_4' | 'FASE_5' | 'FASE_6' | 'FASE_7' | 'END';
  decisions: Decision[];
  isDecisionMode: boolean;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    step: 0,
    phase: 'MENU',
    decisions: [],
    isDecisionMode: false,
  });
  const [history, setHistory] = useState<GameState[]>([]);

  const pushHistory = (state: GameState) => {
    setHistory((prev: GameState[]) => [...prev, state]);
  };

  const goBack = () => {
    setHistory((prev: GameState[]) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setGameState(last);
      return prev.slice(0, -1);
    });
  };

  const getBossImage = (mood: Mood): string => {
    switch (mood) {
      case 'happy': return IMAGES.BOSS_HAPPY;
      case 'angry': return IMAGES.BOSS_ANGRY;
      default: return IMAGES.BOSS_NEUTRAL;
    }
  };

  const nextStep = () => {
    setGameState(prev => {
      pushHistory(prev);
      return { ...prev, step: prev.step + 1 };
    });
  };

  const goToPhase = (phase: GameState['phase']) => {
    setGameState(prev => {
      pushHistory(prev);
      return { ...prev, phase, step: 0, isDecisionMode: false };
    });
  };

  const makeDecision = (id: string, label: string, choice: string, impact: string, nextPhase?: GameState['phase']) => {
    setGameState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        decisions: [...prev.decisions.filter(d => d.id !== id), { id, label, choice, impact }],
        step: prev.step + 1,
        phase: nextPhase || prev.phase,
        isDecisionMode: false
      };
    });
  };

  const pkChoice = useMemo(() => gameState.decisions.find(d => d.id === 'pk')?.choice, [gameState.decisions]);
  const rankingChoice = useMemo(() => gameState.decisions.find(d => d.id === 'ranking')?.choice, [gameState.decisions]);
  const trackingChoice = useMemo(() => gameState.decisions.find(d => d.id === 'tracking')?.choice, [gameState.decisions]);
  const avgChoice = useMemo(() => gameState.decisions.find(d => d.id === 'avg')?.choice, [gameState.decisions]);
  const goodDecisions = useMemo(() => pkChoice === 'ID' && trackingChoice === 'Snapshot' && rankingChoice === 'Volume', [pkChoice, trackingChoice, rankingChoice]);

  const [showDiagram, setShowDiagram] = useState(false);

  const diagramText = useMemo(() => {
    const lines: string[] = ['erDiagram'];

    // pessoa
    if (pkChoice === 'ID') {
      lines.push('    pessoa {', '        int id PK', '        string nome', '        string cpf', '    }');
    } else if (pkChoice === 'CPF') {
      lines.push('    pessoa {', '        string cpf PK', '        string nome', '    }');
    } else {
      lines.push('    pessoa {', '        string nome', '    }');
    }

    // garrafao
    if (trackingChoice === 'Coluna') {
      lines.push('    garrafao {', '        int id PK', '        decimal capacidade_litros', '        decimal litro_atual', '    }');
    } else {
      lines.push('    garrafao {', '        int id PK', '        decimal capacidade_litros', '    }');
    }

    // consumo + abastecimento aparecem após decisão da FASE_1
    if (pkChoice) {
      const fkType = pkChoice === 'ID' ? 'int' : 'string';
      const fkName = pkChoice === 'ID' ? 'pessoa_id' : 'pessoa_cpf';
      lines.push(
        '    consumo {', '        int id PK', '        int garrafao_id FK',
        `        ${fkType} ${fkName} FK`, '        decimal litros', '        datetime created_at', '    }',
        '    abastecimento {', '        int id PK', '        int garrafao_id FK',
        `        ${fkType} ${fkName} FK`, '        decimal litros', '        datetime created_at', '    }',
        '    pessoa ||--o{ consumo : "realiza"',
        '    pessoa ||--o{ abastecimento : "realiza"',
        '    garrafao ||--o{ consumo : "registra"',
        '    garrafao ||--o{ abastecimento : "registra"',
      );
    }

    // garrafao_snapshot aparece após decisão Snapshot na FASE_2
    if (trackingChoice === 'Snapshot') {
      lines.push(
        '    garrafao_snapshot {', '        int id PK', '        int garrafao_id FK',
        '        decimal litro_atual', '        datetime registrado_em', '    }',
        '    garrafao ||--o{ garrafao_snapshot : "rastreia"',
      );
    }

    return lines.join('\n');
  }, [pkChoice, trackingChoice]);

  // Compute scene: which background and which boss image to show
  const sceneInfo = useMemo((): { bossImage: string | null; bg: string } => {
    const { phase, step, isDecisionMode } = gameState;

    if (phase === 'MENU' || phase === 'END') {
      return { bossImage: null, bg: IMAGES.OFFICE };
    }

    if (isDecisionMode) {
      return { bossImage: null, bg: IMAGES.COMPUTER_BLUR };
    }

    const bg = IMAGES.OFFICE;

    if (phase === 'PROLOGUE') {
      if (step === 0) return { bossImage: null, bg }; // Narrador
      return { bossImage: getBossImage('neutral'), bg };
    }

    if (phase === 'FASE_1') {
      if (step === 2) return { bossImage: getBossImage('angry'), bg };
      return { bossImage: getBossImage('neutral'), bg };
    }

    if (phase === 'FASE_2') {
      if (step >= 1) return { bossImage: getBossImage('happy'), bg };
      return { bossImage: getBossImage('neutral'), bg };
    }

    if (phase === 'FASE_3') {
      return { bossImage: getBossImage('angry'), bg };
    }

    if (phase === 'FASE_4') {
      if (step === 0) return { bossImage: getBossImage('happy'), bg };
      if (rankingChoice === 'Frequência') {
        if (step === 1) return { bossImage: getBossImage('happy'), bg };
        if (step === 2) return { bossImage: null, bg }; // "Dias depois" — chefe sai
        return { bossImage: getBossImage('angry'), bg }; // steps 3+ — volta irritada
      }
      return { bossImage: getBossImage('happy'), bg };
    }

    if (phase === 'FASE_5') {
      if (step === 0) return { bossImage: getBossImage('neutral'), bg };
      return { bossImage: getBossImage(pkChoice === 'ID' ? 'happy' : 'angry'), bg };
    }

    if (phase === 'FASE_6') {
      return { bossImage: getBossImage('angry'), bg };
    }

    if (phase === 'FASE_7') {
      if (isDecisionMode) return { bossImage: null, bg: IMAGES.COMPUTER_BLUR };
      if (step === 0) return { bossImage: getBossImage('neutral'), bg };
      const avgChoiceVal = gameState.decisions.find(d => d.id === 'avg')?.choice;
      if (avgChoiceVal === 'WRONG_DIV' || avgChoiceVal === 'WRONG_GROUP') {
        if (step === 1) return { bossImage: getBossImage('neutral'), bg };
        return { bossImage: getBossImage('angry'), bg };
      }
      return { bossImage: getBossImage('happy'), bg };
    }

    return { bossImage: null, bg };
  }, [gameState, pkChoice, rankingChoice]);

  const renderContent = () => {
    const { step, phase, isDecisionMode } = gameState;

    // --- MENU ---
    if (phase === 'MENU') {
      return (
        <div className="w-full h-full flex flex-col justify-between pointer-events-auto px-16 py-14">

          {/* Título — canto superior esquerdo, estilo VN */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <p
              className="text-pink-300 text-sm tracking-[0.35em] uppercase mb-3 drop-shadow-[0_1px_6px_rgba(236,72,153,0.6)]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Um jogo de modelagem de banco de dados
            </p>
            <h1
              className="text-white leading-none drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] text-shadow-vn"
              style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 900 }}
            >
              Doki Doki<br />
              <span className="text-pink-200">Garrafão</span> Club
            </h1>
          </motion.div>

          {/* Botões — canto inferior direito */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-end gap-2"
          >
            {[
              { label: 'Iniciar Jogo', icon: <Play className="w-4 h-4 fill-current" />, onClick: () => goToPhase('PROLOGUE'), active: true },
              { label: 'Configurações', icon: <Settings className="w-4 h-4" />, onClick: undefined, active: false },
            ].map((btn, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12 }}
                onClick={btn.active ? btn.onClick : undefined}
                className={`group flex items-center gap-3 px-8 py-3 rounded-l-full border-r-0 transition-all duration-200
                  ${btn.active
                    ? 'bg-white/10 border border-white/20 hover:bg-pink-500/20 hover:border-pink-400/40 cursor-pointer'
                    : 'bg-white/5 border border-white/10 opacity-40 cursor-not-allowed'}
                `}
                style={{ fontFamily: "'Cinzel', serif", minWidth: '220px' }}
              >
                <span className={`transition-colors text-sm font-bold tracking-widest uppercase ${btn.active ? 'text-white group-hover:text-pink-200' : 'text-white/50'}`}>
                  {btn.label}
                </span>
                <span className={btn.active ? 'text-pink-300' : 'text-white/30'}>{btn.icon}</span>
              </motion.button>
            ))}
          </motion.div>

        </div>
      );
    }

    // --- END ---
    if (phase === 'END') {
      const avgCorrect = avgChoice === 'AVG';

      type Ending = { title: string; badge: string; badgeColor: string; icon: ReturnType<typeof Trophy>; message: string };
      const ending: Ending = goodDecisions && avgCorrect
        ? {
            title: 'Missão Cumprida',
            badge: 'AUMENTO',
            badgeColor: 'bg-green-500/20 text-green-300',
            icon: <Trophy className="w-20 h-20 text-pink-300 animate-float" />,
            message: 'ID surrogate, snapshot bem estruturado, ranking correto e média precisa. Você recebe um aumento — e o garrafão vai agradecer.',
          }
        : !goodDecisions && avgCorrect
        ? {
            title: 'Podia Ser Pior',
            badge: 'SOBREVIVEU',
            badgeColor: 'bg-yellow-500/20 text-yellow-300',
            icon: <CheckCircle2 className="w-20 h-20 text-yellow-300 animate-float" />,
            message: 'Finalmente fez uma query certa. Pena que o banco tá todo torto embaixo disso. Mas pelo menos dessa você não fugiu.',
          }
        : goodDecisions && !avgCorrect
        ? {
            title: 'Tão Perto...',
            badge: 'SEM CAFEÍNA',
            badgeColor: 'bg-orange-500/20 text-orange-300',
            icon: <AlertCircle className="w-20 h-20 text-orange-300 animate-float" />,
            message: 'Banco perfeito, modelagem impecável... e você trava numa média aritmética. Você não tá cansado não? Vou pedir um garrafão de café.',
          }
        : {
            title: 'Demitido',
            badge: 'DEMITIDO',
            badgeColor: 'bg-red-500/20 text-red-300',
            icon: <AlertCircle className="w-20 h-20 text-red-400 animate-float" />,
            message: 'Banco mal modelado, inconsistências em cascata, query errada no final. Você está demitido. Mas o garrafão fica.',
          };

      return (
        <div className="w-full h-full flex items-center justify-center p-6 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="vn-glass p-12 rounded-[3rem] max-w-2xl w-full flex flex-col items-center gap-8 overflow-y-auto max-h-[90vh]"
          >
            {ending.icon}
            <div className="flex flex-col items-center gap-3">
              <h2
                className="text-4xl text-center text-shadow-vn text-white"
                style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900 }}
              >
                {ending.title}
              </h2>
              <span className={`px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${ending.badgeColor}`}
                style={{ fontFamily: "'Cinzel', serif" }}>
                {ending.badge}
              </span>
            </div>

            <p className="text-white/90 text-center leading-relaxed max-w-md" style={{ fontFamily: "'Cinzel', serif" }}>
              "{ending.message}"
            </p>

            <div className="h-px w-32 bg-gradient-to-r from-transparent via-pink-400 to-transparent" />

            <div className="w-full space-y-4">
              <h3
                className="text-sm flex items-center gap-2 text-pink-300 tracking-[0.2em] uppercase"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                <History className="w-4 h-4" /> Log de Decisões
              </h3>
              {gameState.decisions.map((d, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-white/60 uppercase tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>{d.label}</span>
                    <span className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-xs font-bold">{d.choice}</span>
                  </div>
                  <p className="text-white/90 leading-relaxed">{d.impact}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="vn-button w-full flex items-center justify-center gap-3 mt-4"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <RotateCcw className="w-5 h-5" />
              Recomeçar Jornada
            </button>
          </motion.div>
        </div>
      );
    }

    // --- PROLOGUE ---
    if (phase === 'PROLOGUE') {
      if (step === 0) {
        return (
          <Dialogue
            mood="neutral"
            speaker="Narrador"
            text="A startup tem 15 funcionários, um garrafão no corredor e um problema sério: ninguém sabe quem esvazia e some. A chefe chamou você na sala."
            onNext={nextStep}
          />
        );
      }
      return (
        <Dialogue
          mood="neutral"
          speaker="Chefe"
          text="Preciso de um sistema pra controlar o garrafão. Quero saber quem bebe, quem enche e quem é o culpado quando acaba. Você tem uma semana."
          onNext={() => goToPhase('FASE_1')}
        />
      );
    }

    // --- FASE 1 ---
    if (phase === 'FASE_1') {
      if (step === 0 && !isDecisionMode) {
        return (
          <Dialogue
            mood="neutral"
            speaker="Chefe"
            text="Primeiro passo: representar os funcionários no banco. Precisamos saber o nome de cada pessoa e conseguir identificá-la de forma única. Qual campo pode ser a chave primária dessa tabela?"
            onNext={() => setGameState(prev => ({ ...prev, isDecisionMode: true }))}
          />
        );
      }
      if (isDecisionMode) {
        return (
          <DecisionBox
            title="Modelando as Pessoas"
            subtitle="Decisão 1 — Chave primária de pessoa"
            context="Precisamos saber o nome de cada pessoa e conseguir identificá-la de forma única. Qual campo pode ser a chave primária dessa tabela?"
            options={[
              {
                label: 'CPF',
                desc: 'Identificador real, já existe no RH, evita duplicatas.',
                onClick: () => makeDecision('pk', 'Chave Primária', 'CPF', 'Usou CPF como PK — gerou trabalho extra na migração internacional da Fase 5.')
              },
              {
                label: 'ID autoincrement',
                desc: 'Simples, leve, independente de dado externo.',
                onClick: () => makeDecision('pk', 'Chave Primária', 'ID', 'Usou ID surrogate — facilitou mudanças em dados sensíveis sem cascata.')
              },
              {
                label: 'Nome',
                desc: 'Direto, todo mundo entende.',
                onClick: () => setGameState(prev => ({ ...prev, step: 2, isDecisionMode: false }))
              },
            ]}
          />
        );
      }
      if (step === 2) {
        return (
          <Dialogue
            mood="angry"
            speaker="Sistema"
            text="ERRO: Tem dois Pedros na empresa. O banco recusou o INSERT. Essa abordagem não funciona — tente outra."
            onNext={() => setGameState(prev => ({ ...prev, step: 0, isDecisionMode: true }))}
          />
        );
      }
      // step 3+ — schema explanation
      return (
        <Dialogue
          mood="neutral"
          speaker="Chefe"
          text="Beleza, pessoas cadastradas. Agora precisa registrar o que acontece com o garrafão. Tem dois eventos: alguém bebe, alguém enche. Cada um vira uma tabela."
          code={pkChoice === 'CPF'
            ? `CREATE TABLE consumo (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  garrafao_id INT,\n  pessoa_cpf VARCHAR(14),\n  litros DECIMAL(4,2),\n  created_at DATETIME,\n  FOREIGN KEY (pessoa_cpf) REFERENCES pessoa(cpf)\n);\n\nCREATE TABLE abastecimento (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  garrafao_id INT,\n  pessoa_cpf VARCHAR(14),\n  litros DECIMAL(4,2),\n  created_at DATETIME,\n  FOREIGN KEY (pessoa_cpf) REFERENCES pessoa(cpf)\n);`
            : `CREATE TABLE consumo (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  garrafao_id INT,\n  pessoa_id INT,\n  litros DECIMAL(4,2),\n  created_at DATETIME,\n  FOREIGN KEY (pessoa_id) REFERENCES pessoa(id)\n);\n\nCREATE TABLE abastecimento (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  garrafao_id INT,\n  pessoa_id INT,\n  litros DECIMAL(4,2),\n  created_at DATETIME,\n  FOREIGN KEY (pessoa_id) REFERENCES pessoa(id)\n);`
          }
          onNext={() => goToPhase('FASE_2')}
        />
      );
    }

    // --- FASE 2 ---
    if (phase === 'FASE_2') {
      if (step === 0 && !isDecisionMode) {
        return (
          <Dialogue
            mood="neutral"
            speaker="Chefe"
            text="O garrafão tem capacidade de 20 litros. Preciso saber se tá cheio ou vazio a qualquer momento."
            onNext={() => setGameState(prev => ({ ...prev, isDecisionMode: true }))}
          />
        );
      }
      if (isDecisionMode) {
        return (
          <DecisionBox
            title="Rastreamento de Nível"
            subtitle="Decisão 2 — Como saber o nível atual"
            context="O garrafão tem 20 litros de capacidade. Preciso saber se tá cheio ou vazio a qualquer momento. Como vamos rastrear o nível atual?"
            options={[
              {
                label: 'Via consulta',
                desc: 'Sem coluna extra, consistência garantida. Calcula somando abastecimentos e subtraindo consumos.',
                onClick: () => makeDecision('tracking', 'Rastreamento', 'Consulta', 'Optou por cálculo em tempo real — lentidão surgiu com 50 mil registros.')
              },
              {
                label: 'Tabela snapshot',
                desc: 'Tabela separada com registro do litro a cada operação. Precisa de insert a cada operação.',
                onClick: () => makeDecision('tracking', 'Rastreamento', 'Snapshot', 'Usou snapshot — consistência fragilizada quando alguém inseriu direto no banco.')
              },
              {
                label: 'litro_atual no garrafão',
                desc: 'Leitura direta, zero cálculo. Precisa ser atualizado a cada consumo ou abastecimento.',
                onClick: () => makeDecision('tracking', 'Rastreamento', 'Coluna', 'Usou coluna litro_atual — inconsistência surgiu após edição direta no banco.')
              },
            ]}
          />
        );
      }
      return (
        <Dialogue
          mood="happy"
          speaker="Chefe"
          text="Ótimo! Estrutura pronta. Agora quero ver o nível do garrafão na tela principal."
          onNext={() => goToPhase('FASE_3')}
        />
      );
    }

    // --- FASE 3 ---
    if (phase === 'FASE_3') {
      const trackingChoice = gameState.decisions.find(d => d.id === 'tracking')?.choice;
      if (step === 0) {
        const text = trackingChoice === 'Consulta'
          ? "Por que tá lento?! A tela demora 4 segundos pra carregar. Temos 50 mil registros acumulados. Isso é inaceitável."
          : trackingChoice === 'Snapshot'
            ? "O sistema tá mentindo? Mostra 8L mas o garrafão tá na metade. Alguém inseriu um consumo direto no banco e não inseriu o registro correspondente na tabela snapshot."
            : "O sistema tá mentindo? Mostra 8L mas o garrafão tá na metade. Alguém inseriu um consumo direto no banco e não atualizou o campo litro_atual.";
        return (
          <Dialogue
            mood="angry"
            speaker="Chefe"
            text={text}
            onNext={trackingChoice === 'Consulta' ? () => goToPhase('FASE_4') : nextStep}
          />
        );
      }
      // step 1 — Coluna ou Snapshot: sugestão de correção diferenciada
      return (
        <Dialogue
          mood="angry"
          speaker="Chefe"
          text={trackingChoice === 'Snapshot'
            ? "Toda operação no garrafão precisa inserir uma linha na tabela snapshot. Use um trigger no banco para garantir isso automaticamente."
            : "O litro_atual precisa ser atualizado a cada operação. Use um trigger no banco para garantir isso automaticamente."
          }
          onNext={() => goToPhase('FASE_4')}
        />
      );
    }

    // --- FASE 4 ---
    if (phase === 'FASE_4') {
      if (step === 0 && !isDecisionMode) {
        return (
          <Dialogue
            mood="happy"
            speaker="Chefe"
            text="Quero reconhecer publicamente quem mais contribui pro garrafão. Cria um ranking!"
            onNext={() => setGameState(prev => ({ ...prev, isDecisionMode: true }))}
          />
        );
      }
      if (isDecisionMode) {
        const joinA = pkChoice === 'CPF'
          ? 'JOIN pessoa p ON p.cpf = a.pessoa_cpf'
          : 'JOIN pessoa p ON p.id = a.pessoa_id';
        const joinC = pkChoice === 'CPF'
          ? 'JOIN pessoa p ON p.cpf = c.pessoa_cpf'
          : 'JOIN pessoa p ON p.id = c.pessoa_id';
        const groupBy = pkChoice === 'CPF'
          ? 'GROUP BY p.cpf, p.nome'
          : 'GROUP BY p.id, p.nome';
        const selectPk = pkChoice === 'CPF' ? 'p.cpf, p.nome' : 'p.id, p.nome';
        return (
          <SqlDecisionBox
            title="Métrica do Ranking"
            subtitle="Decisão 3 — Como medir contribuição"
            context="Quero reconhecer publicamente quem mais contribui pro garrafão. O ranking vai premiar quem mais abastece — mas o que define 'mais'? Analise os SQLs candidatos:"
            sqlOptions={[
              {
                label: 'Frequência',
                sql: `SELECT ${selectPk}, COUNT(*) AS total_abastecimentos\nFROM abastecimento a\n${joinA}\nWHERE MONTH(a.created_at) = MONTH(NOW())\n${groupBy}\nORDER BY total_abastecimentos DESC\nLIMIT 1`,
                isCorrect: true,
                errorMsg: '',
              },
              {
                label: 'Consumo invertido',
                sql: `SELECT ${selectPk}, COUNT(*) AS total\nFROM consumo c\n${joinC}\nWHERE MONTH(c.created_at) = MONTH(NOW())\n${groupBy}\nORDER BY total DESC\nLIMIT 1`,
                isCorrect: false,
                errorMsg: 'Este SQL usa a tabela consumo — está premiando quem mais BEBEU, não quem mais abasteceu. O ranking ficaria de cabeça para baixo.',
              },
              {
                label: 'Volume',
                sql: `SELECT ${selectPk}, SUM(a.litros) AS total_litros\nFROM abastecimento a\n${joinA}\nWHERE MONTH(a.created_at) = MONTH(NOW())\n${groupBy}\nORDER BY total_litros DESC\nLIMIT 1`,
                isCorrect: true,
                errorMsg: '',
              },
            ]}
            onDecide={(label) => {
              if (label === 'Frequência') {
                makeDecision('ranking', 'Métrica Ranking', 'Frequência', 'Premiou quem abastecia 200ml várias vezes em vez de quem realmente enchia.');
              } else {
                makeDecision('ranking', 'Métrica Ranking', 'Volume', 'Premiou quem realmente enchia o garrafão — métrica por volume total.');
              }
            }}
          />
        );
      }
      if (rankingChoice === 'Frequência') {
        if (step === 1) {
          return (
            <Dialogue
              mood="happy"
              speaker="Chefe"
              text="Parabéns Joãozinho! Cinco abastecimentos esse mês — recorde da empresa! Que dedicação!"
              onNext={nextStep}
            />
          );
        }
        if (step === 2) {
          return (
            <Dialogue
              mood="neutral"
              speaker="Narrador"
              text="Dias depois..."
              onNext={nextStep}
            />
          );
        }
        if (step === 3) {
          return (
            <Dialogue
              mood="angry"
              speaker="Chefe"
              text="O garrafão vive vazio mesmo assim. Joãozinho colocava 200ml de cada vez só pra subir no ranking. Ele não estava contribuindo — estava manipulando o sistema."
              onNext={nextStep}
            />
          );
        }
        return (
          <Dialogue
            mood="angry"
            speaker="Chefe"
            text="Essa métrica não funciona. Corrija: use o volume total de litros abastecidos. Quem realmente enche o garrafão deve liderar o ranking."
            onNext={() => goToPhase('FASE_5')}
          />
        );
      }
      return (
        <Dialogue
          mood="happy"
          speaker="Chefe"
          text="Maria, 47 litros esse mês. Incrível! Ela realmente carrega esse time nas costas."
          code={pkChoice === 'CPF'
            ? `SELECT p.nome, SUM(a.litros) as total_litros\nFROM abastecimento a\nJOIN pessoa p ON p.cpf = a.pessoa_cpf\nWHERE MONTH(a.created_at) = MONTH(NOW())\nGROUP BY p.cpf, p.nome\nORDER BY total_litros DESC\nLIMIT 1`
            : `SELECT p.nome, SUM(a.litros) as total_litros\nFROM abastecimento a\nJOIN pessoa p ON p.id = a.pessoa_id\nWHERE MONTH(a.created_at) = MONTH(NOW())\nGROUP BY p.id, p.nome\nORDER BY total_litros DESC\nLIMIT 1`
          }
          onNext={() => goToPhase('FASE_5')}
        />
      );
    }

    // --- FASE 5 ---
    if (phase === 'FASE_5') {
      if (step === 0) {
        return (
          <Dialogue
            mood="neutral"
            speaker="Chefe"
            text="Reunião agora. A empresa fechou parceria internacional. O RH vai adotar um novo formato de CPF com prefixo de país: BR-123.456.789-00. Mudança obrigatória."
            onNext={nextStep}
          />
        );
      }
      if (pkChoice === 'ID') {
        return (
          <Dialogue
            mood="happy"
            speaker="Chefe"
            text="CPF é só uma coluna em pessoa. Você faz um UPDATE, pronto. Rápido. Gostei."
            onNext={() => goToPhase('FASE_6')}
          />
        );
      }
      if (step === 1) {
        return (
          <Dialogue
            mood="angry"
            speaker="Chefe"
            text="CPF é PK em pessoa e FK em consumo e abastecimento. Mudar o formato exige atualizar tudo em cascata. Quanto tempo vai levar?"
            onNext={nextStep}
          />
        );
      }
      if (step === 2) {
        return (
          <Dialogue
            mood="neutral"
            speaker="Sistema"
            text="Primeiro: identificar o horário com menor movimento no banco para minimizar o impacto."
            code={`SELECT HOUR(created_at) AS hora,\n       COUNT(*) AS total_operacoes\nFROM consumo\nWHERE garrafao_id = 1\nGROUP BY hora\nORDER BY total_operacoes ASC\nLIMIT 3;\n\n-- Resultado:\n-- hora | total_operacoes\n--    6 |               2\n--    7 |               3\n--   22 |               5`}
            onNext={nextStep}
          />
        );
      }
      if (step === 3) {
        return (
          <Dialogue
            mood="neutral"
            speaker="Sistema"
            text="Menor movimento: 6h–7h da manhã. O MySQL checa constraints em cada statement — sem desligar o FK check primeiro, o UPDATE em pessoa falha imediatamente. A transação garante o rollback se algo der errado."
            code={`-- MySQL checa FK em cada statement, não no COMMIT.\n-- Precisamos desligar temporariamente.\nSET FOREIGN_KEY_CHECKS = 0;\n\nBEGIN;\n  UPDATE pessoa\n    SET cpf = CONCAT('BR-', cpf);\n  UPDATE consumo\n    SET pessoa_cpf = CONCAT('BR-', pessoa_cpf);\n  UPDATE abastecimento\n    SET pessoa_cpf = CONCAT('BR-', pessoa_cpf);\nCOMMIT;\n\nSET FOREIGN_KEY_CHECKS = 1;`}
            onNext={nextStep}
          />
        );
      }
      return (
        <Dialogue
          mood="angry"
          speaker="Chefe"
          text="45 minutos de trabalho que não existiriam com um ID surrogate. Da próxima vez pensa antes."
          onNext={() => goToPhase('FASE_6')}
        />
      );
    }

    // --- FASE 6 ---
    if (phase === 'FASE_6') {
      const joinP = pkChoice === 'CPF'
        ? 'JOIN pessoa p ON p.cpf = c.pessoa_cpf'
        : 'JOIN pessoa p ON p.id = c.pessoa_id';

      if (step === 0) {
        return (
          <Dialogue
            mood="angry"
            speaker="Chefe"
            text="O garrafão zerou às 14h. Ninguém encheu. Quero saber quem foi o último a beber. Agora!"
            onNext={nextStep}
          />
        );
      }

      // --- Snapshot: consulta direta na tabela snapshot ---
      if (trackingChoice === 'Snapshot') {
        return (
          <Dialogue
            mood="neutral"
            speaker="Sistema"
            text="Fulano. 14h32. 0.3L. Última pessoa a consumir antes do garrafão zerar."
            code={`SELECT p.nome, c.created_at, c.litros\nFROM garrafao_snapshot s\nJOIN consumo c\n  ON c.garrafao_id = s.garrafao_id\n AND c.created_at = s.registrado_em\n${joinP}\nWHERE s.garrafao_id = 1\n  AND s.litro_atual = 0\nORDER BY s.registrado_em DESC\nLIMIT 1`}
            onNext={() => goToPhase('FASE_7')}
          />
        );
      }

      // --- Consulta / Coluna: cálculo correndo por hora/minuto ---
      if (step === 1) {
        return (
          <Dialogue
            mood="neutral"
            speaker="Sistema"
            text="Calculando saldo por operação até encontrar o momento em que o garrafão zerou..."
            code={`SELECT p.nome, c.created_at, c.litros\nFROM consumo c\n${joinP}\nWHERE c.garrafao_id = 1\n  AND (\n    SELECT COALESCE(SUM(a.litros), 0)\n    FROM abastecimento a\n    WHERE a.garrafao_id = 1\n      AND a.created_at <= c.created_at\n  ) - (\n    SELECT COALESCE(SUM(c2.litros), 0)\n    FROM consumo c2\n    WHERE c2.garrafao_id = 1\n      AND c2.created_at <= c.created_at\n  ) <= 0\nORDER BY c.created_at ASC\nLIMIT 1\n\n-- Resultado: Fulano | 14:32 | 0.3L`}
            onNext={nextStep}
          />
        );
      }
      return (
        <Dialogue
          mood="angry"
          speaker="Chefe"
          text="Demorou 8 segundos pra me dar o nome de uma pessoa. Se tivesse usado snapshot, seria uma linha direto na tabela. Anota isso pra próxima."
          onNext={() => goToPhase('FASE_7')}
        />
      );
    }

    // --- FASE 7 ---
    if (phase === 'FASE_7') {
      const joinC = pkChoice === 'CPF'
        ? 'JOIN pessoa p ON p.cpf = c.pessoa_cpf'
        : 'JOIN pessoa p ON p.id = c.pessoa_id';
      const groupBy = pkChoice === 'CPF' ? 'GROUP BY p.cpf, p.nome' : 'GROUP BY p.id, p.nome';
      const selectPk = pkChoice === 'CPF' ? 'p.cpf, p.nome' : 'p.id, p.nome';

      if (step === 0 && !isDecisionMode) {
        return (
          <Dialogue
            mood="neutral"
            speaker="Chefe"
            text="Enquanto isso... quero saber quem consome mais por vez. Não o total — a média por consumo. Quem bebe mais de uma vez?"
            onNext={() => setGameState(prev => ({ ...prev, isDecisionMode: true }))}
          />
        );
      }
      if (isDecisionMode) {
        const pkCol = pkChoice === 'CPF' ? 'p.cpf' : 'p.id';
        return (
          <SqlDecisionBox
            title="Média de Consumo"
            subtitle="Decisão 4 — Como calcular a média por pessoa"
            context="Quero saber a média de litros consumidos por vez de cada pessoa — não o total acumulado. Qual SQL resolve isso corretamente?"
            sqlOptions={[
              {
                label: 'AVG sem GROUP BY',
                sql: `SELECT p.nome, AVG(c.litros) AS media_por_vez\nFROM consumo c\n${joinC}\nORDER BY media_por_vez DESC`,
                isCorrect: false,
                errorMsg: 'Sem GROUP BY, o banco não sabe como agrupar os resultados por pessoa. Em modo estrito, retorna erro imediato.',
              },
              {
                label: 'GROUP BY só por nome',
                sql: `SELECT ${pkCol}, p.nome, AVG(c.litros) AS media_por_vez\nFROM consumo c\n${joinC}\nGROUP BY p.nome\nORDER BY media_por_vez DESC`,
                isCorrect: true,
                errorMsg: '',
              },
              {
                label: 'Total ÷ nº de pessoas',
                sql: `SELECT ${selectPk},\n       SUM(c.litros) / (SELECT COUNT(*) FROM pessoa) AS media\nFROM consumo c\n${joinC}\n${groupBy}\nORDER BY media DESC`,
                isCorrect: true,
                errorMsg: '',
              },
              {
                label: 'AVG por pessoa',
                sql: `SELECT ${selectPk},\n       AVG(c.litros) AS media_por_vez\nFROM consumo c\n${joinC}\n${groupBy}\nORDER BY media_por_vez DESC`,
                isCorrect: true,
                errorMsg: '',
              },
            ]}
            onDecide={(label) => {
              if (label === 'AVG por pessoa') {
                makeDecision('avg', 'Média de Consumo', 'AVG', 'Calculou corretamente a média por consumo usando AVG com GROUP BY.');
              } else if (label === 'Total ÷ nº de pessoas') {
                makeDecision('avg', 'Média de Consumo', 'WRONG_DIV', 'Dividiu pelo total de pessoas — chefe descobriu que os números não fechavam.');
              } else {
                makeDecision('avg', 'Média de Consumo', 'WRONG_GROUP', 'Agrupou só por nome — chefe percebeu que pessoas homônimas estavam sendo mescladas.');
              }
            }}
          />
        );
      }

      // Pós-decisão errada: chefe descobre o erro
      if (avgChoice === 'WRONG_DIV' || avgChoice === 'WRONG_GROUP') {
        if (step === 1) {
          const suspicion = avgChoice === 'WRONG_DIV'
            ? "Hmm... a média da Ana caiu pela metade quando eu contratei dois estagiários. Isso faz sentido?"
            : "Hmm... o sistema agrupou a Ana e a Ana Clara como uma pessoa só. Elas são pessoas diferentes.";
          return (
            <Dialogue
              mood="neutral"
              speaker="Chefe"
              text={suspicion}
              onNext={nextStep}
            />
          );
        }
        const complaint = avgChoice === 'WRONG_DIV'
          ? "Você dividiu pelo total de funcionários, não pelos consumos de cada pessoa. A média dela não tem nada a ver com quantas pessoas tem aqui."
          : "GROUP BY só por nome não garante unicidade. Duas pessoas com o mesmo nome viram uma linha só. Usa o identificador.";
        return (
          <Dialogue
            mood="angry"
            speaker="Chefe"
            text={complaint}
            onNext={() => goToPhase('END')}
          />
        );
      }

      // Pós-decisão correta
      if (step === 1) {
        return (
          <Dialogue
            mood="happy"
            speaker="Chefe"
            text="Perfeito. AVG com GROUP BY por pessoa — simples e correto. Você sabe o que tá fazendo."
            onNext={() => goToPhase('END')}
          />
        );
      }
    }

    return null;
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">

      {/* Layer 1 — Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sceneInfo.bg}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <img
            src={sceneInfo.bg}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: `blur(8px) brightness(${gameState.isDecisionMode ? 0.25 : 0.4})`, transform: 'scale(1.08)' }}
          />
          {gameState.isDecisionMode && (
            <div className="absolute inset-0 bg-slate-950/30" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Layer 2 — Character Sprite */}
      <AnimatePresence mode="wait">
        {sceneInfo.bossImage && (
          <motion.img
            key={sceneInfo.bossImage}
            src={sceneInfo.bossImage}
            alt="Chefe"
            className="absolute bottom-[190px] left-[4%] h-[72vh] max-h-[620px] object-contain pointer-events-none z-10"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Layer 3 — Game UI */}
      <div key={`${gameState.phase}-${gameState.step}-${gameState.isDecisionMode}`} className="absolute inset-0 pointer-events-none z-20">
        {renderContent()}
      </div>

      {/* Botão Voltar */}
      <AnimatePresence>
        {history.length > 0 && gameState.phase !== 'MENU' && gameState.phase !== 'END' && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onClick={goBack}
            className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-white/20 hover:bg-pink-500/20 hover:border-pink-400/40 transition-all cursor-pointer"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            <RotateCcw className="w-3.5 h-3.5 text-white/70" />
            <span className="text-white/70 text-xs tracking-widest uppercase">Voltar</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Botão Diagrama */}
      <AnimatePresence>
        {gameState.phase !== 'MENU' && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowDiagram(true)}
            className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-white/20 hover:bg-indigo-500/20 hover:border-indigo-400/40 transition-all cursor-pointer"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            <Database className="w-3.5 h-3.5 text-white/70" />
            <span className="text-white/70 text-xs tracking-widest uppercase">Esquema</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal Diagrama */}
      <AnimatePresence>
        {showDiagram && (
          <DiagramModal
            diagramText={diagramText}
            pkChoice={pkChoice}
            trackingChoice={trackingChoice}
            onClose={() => setShowDiagram(false)}
          />
        )}
      </AnimatePresence>

      {/* Layer 4 — Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
}

// --- Dialogue component: pure textbox, no sprite ---
function Dialogue({ mood, speaker, text, code, onNext }: {
  mood: Mood;
  speaker: string;
  text: string;
  code?: string;
  onNext: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);
  const [sqlVisible, setSqlVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSqlVisible(false);
    let i = 0;
    setDisplayed("");
    setTyping(true);
    intervalRef.current = setInterval(() => {
      const char = text.charAt(i);
      i++;
      setDisplayed(prev => prev + char);
      if (i >= text.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setTyping(false);
      }
    }, 22);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  const handleClick = () => {
    if (typing) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplayed(text);
      setTyping(false);
    } else {
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-0 left-0 right-0 pointer-events-auto cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Speaker nameplate */}
      <div className="ml-10 mb-0 inline-flex items-center gap-2 vn-nameplate">
        {mood === 'happy' && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
        {mood === 'angry' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
        {mood === 'neutral' && <Database className="w-4 h-4 text-pink-400 shrink-0" />}
        <span className="text-white text-base tracking-[0.12em] uppercase" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>{speaker}</span>
      </div>

      {/* Text box */}
      <div className="vn-textbox mx-6 mb-6">
        <p className="text-xl font-medium leading-relaxed text-white/95">
          {displayed}
          {typing && <span className="inline-block w-[2px] h-5 bg-pink-400 ml-1 align-middle animate-pulse" />}
        </p>

        {code && !typing && (
          <div className="mt-4">
            <button
              onClick={e => { e.stopPropagation(); setSqlVisible(v => !v); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-500/15 border border-pink-400/30 text-pink-300 text-xs font-bold uppercase tracking-widest hover:bg-pink-500/25 transition-colors"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <Code2 className="w-3 h-3" />
              {sqlVisible ? 'Ocultar SQL' : 'Ver SQL'}
            </button>
            <AnimatePresence>
              {sqlVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 bg-black/60 rounded-xl p-4 font-mono text-sm text-blue-300 border border-white/10">
                    <pre className="whitespace-pre-wrap leading-relaxed">{code}</pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!typing && (
          <div className="flex justify-end mt-3">
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center gap-1 text-pink-300/50 text-xs uppercase tracking-[0.2em]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Clique para continuar <ChevronRight size={12} />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Decision box component ---
function DecisionBox({ title, subtitle, context, options }: {
  title: string;
  subtitle?: string;
  context?: string;
  options: { label: string; desc: string; onClick: () => void }[];
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center pointer-events-auto px-6 gap-5">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2
          className="text-4xl text-white text-shadow-vn"
          style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900 }}
        >{title}</h2>
        {subtitle && (
          <p className="text-pink-300/80 text-xs mt-2 tracking-[0.25em] uppercase" style={{ fontFamily: "'Cinzel', serif" }}>{subtitle}</p>
        )}
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-pink-400 to-transparent mx-auto mt-4" />
      </motion.div>

      {context && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-white/90 text-base leading-relaxed max-w-xl text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
        >
          {context}
        </motion.p>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xl">
        {options.map((opt, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            onClick={opt.onClick}
            className="vn-button group flex flex-col items-start gap-1 text-left"
          >
            <span
              className="text-base group-hover:text-pink-200 transition-colors drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-wider uppercase"
              style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
            >{opt.label}</span>
            <span className="text-sm text-white/80 font-medium group-hover:text-white transition-colors drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{opt.desc}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// --- SQL Decision Box component ---
function SqlDecisionBox({ title, subtitle, context, sqlOptions, onDecide }: {
  title: string;
  subtitle?: string;
  context?: string;
  sqlOptions: { label: string; sql: string; isCorrect: boolean; errorMsg: string; proceed?: boolean }[];
  onDecide: (label: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const current = sqlOptions[index];

  const handleConfirm = () => {
    if (current.isCorrect) {
      onDecide(current.label);
    } else {
      setErrorMsg(current.errorMsg);
    }
  };

  const handleNext = () => {
    setErrorMsg(null);
    setIndex((index + 1) % sqlOptions.length);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center pointer-events-auto px-6 gap-4">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h2
          className="text-4xl text-white text-shadow-vn"
          style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900 }}
        >{title}</h2>
        {subtitle && (
          <p className="text-pink-300/80 text-xs mt-2 tracking-[0.25em] uppercase" style={{ fontFamily: "'Cinzel', serif" }}>{subtitle}</p>
        )}
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-pink-400 to-transparent mx-auto mt-4" />
      </motion.div>

      {context && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="text-white/90 text-sm leading-relaxed max-w-xl text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
        >{context}</motion.p>
      )}

      {/* SQL block */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2 text-pink-300/70 text-xs uppercase tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>
              <Code2 className="w-3 h-3" />
              SQL candidato
            </div>
            <span className="text-white/40 text-xs" style={{ fontFamily: "'Cinzel', serif" }}>
              {index + 1} / {sqlOptions.length}
            </span>
          </div>
          <div className="bg-black/70 rounded-xl p-4 font-mono text-sm text-blue-300 border border-white/10">
            <pre className="whitespace-pre-wrap leading-relaxed">{current.sql}</pre>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-red-950/60 border border-red-500/40 rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm leading-relaxed">{errorMsg}</p>
            </div>
            {current.proceed && (
              <button
                onClick={() => onDecide(current.label)}
                className="self-end text-xs text-red-300/60 hover:text-red-200 underline underline-offset-2 transition-colors"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Continuar assim mesmo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pergunta + botões */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-3 w-full max-w-2xl"
      >
        <p className="text-white/80 text-sm" style={{ fontFamily: "'Cinzel', serif" }}>
          Este SQL resolve o problema corretamente?
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={handleConfirm}
            className="vn-button flex-1 flex items-center justify-center gap-2 hover:border-green-400/50 hover:bg-green-500/10"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Sim, esse resolve
          </button>
          <button
            onClick={handleNext}
            className="vn-button flex-1 flex items-center justify-center gap-2 hover:border-pink-400/50 hover:bg-pink-500/10"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Ver próximo SQL
            <ChevronRight className="w-4 h-4 text-pink-300" />
          </button>
        </div>
      </motion.div>

    </div>
  );
}

// --- Diagram Modal ---
function DiagramModal({ diagramText, pkChoice, trackingChoice, onClose }: {
  diagramText: string;
  pkChoice: string | undefined;
  trackingChoice: string | undefined;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    mermaid.render(idRef.current, diagramText).then(({ svg }) => {
      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = '100%';
          svgEl.style.height = 'auto';
          svgEl.style.maxHeight = '60vh';
        }
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [diagramText]);

  const labels: { label: string; desc: string }[] = [];
  if (!pkChoice) labels.push({ label: 'Chave primária', desc: 'não decidida ainda' });
  else labels.push({ label: 'Chave primária', desc: pkChoice === 'ID' ? 'ID surrogate' : 'CPF' });
  if (trackingChoice) labels.push({ label: 'Rastreamento', desc: trackingChoice });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-3xl mx-4 vn-glass rounded-3xl p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => { e.stopPropagation(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-2xl text-white text-shadow-vn"
              style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900 }}
            >
              Esquema do Banco
            </h2>
            <p className="text-pink-300/70 text-xs mt-1 tracking-[0.2em] uppercase" style={{ fontFamily: "'Cinzel', serif" }}>
              Estado atual do modelo de dados
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-pink-500/20 hover:border-pink-400/40 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

        {/* Decision badges */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {labels.map((l, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20">
                <span className="text-indigo-300/60 text-xs uppercase tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>{l.label}:</span>
                <span className="text-indigo-200 text-xs font-bold tracking-wide" style={{ fontFamily: "'Cinzel', serif" }}>{l.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Diagram */}
        <div
          ref={containerRef}
          className="w-full flex justify-center"
        />

        {/* Tracking note */}
        {trackingChoice === 'Consulta' && (
          <p className="text-white/50 text-xs text-center italic" style={{ fontFamily: "'Cinzel', serif" }}>
            O nível do garrafão é calculado via query — nenhuma tabela extra foi adicionada.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
