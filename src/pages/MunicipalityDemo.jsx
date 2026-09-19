import React, { useState, useEffect, useRef } from 'react';
import { Button, Form, Input, Dropdown, message, Card, Statistic, Progress, Collapse, Divider } from 'antd';
import { ArrowRightOutlined, PhoneOutlined, CheckCircleFilled, GlobalOutlined, FileTextOutlined, BookOutlined, CloseOutlined, BankOutlined, TranslationOutlined, DatabaseOutlined, UserOutlined, MedicineBoxOutlined, HomeOutlined, SafetyCertificateOutlined, CarOutlined, AuditOutlined, CalendarOutlined, SettingOutlined, ApiOutlined, ThunderboltOutlined, SmileOutlined } from '@ant-design/icons';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generateClient } from 'aws-amplify/data';
import OctoplanDemo from '../../Demo/OctoplanDemo';
import { useTranslation } from '../hooks/useTranslation';
import receptionistWelcomePhoto from '../assets/photos/receptionist-welcome.jpg';
import uccleReceptionPhoto from '../assets/photos/uccle-reception.jpg';
import receptionistTestimonialPhoto from '../assets/photos/receptionist-testimonial.jpg';
import './DattivoxLanding.css';
import './MunicipalityDemo.css';

const { TextArea } = Input;
// NOTE: TEST_PHONE_NUMBER stays the single source of truth for every tel: link on this page
// (header, hero, closing section). The brief's closing section names "02 393 07 39" as display
// text — if VITE_TEST_PHONE differs from that number in a given environment, the tel: link still
// points at TEST_PHONE_NUMBER so the number that's dialled always matches the number configured
// for this deployment, while the visible digits below follow the brief.
const TEST_PHONE_NUMBER = import.meta.env.VITE_TEST_PHONE || '+32 2 620 61 49';
const DISPLAY_PHONE = '02 393 07 39';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'hello@dattico.com';

// ── Mock data (proof / municipality case study) ──

const getConversation = (t) => [
  { role: 'citizen', text: t('municipality.conversation.msg1') },
  { role: 'assistant', text: t('municipality.conversation.msg2') },
  { role: 'citizen', text: t('municipality.conversation.msg3') },
  { role: 'assistant', text: t('municipality.conversation.msg4') },
  { role: 'citizen', text: t('municipality.conversation.msg5') },
  { role: 'assistant', text: t('municipality.conversation.msg6') },
];

const getLanguageData = () => [
  { name: 'FR', value: 73 },
  { name: 'NL', value: 27 },
];
const LANGUAGE_COLORS = { FR: '#4C2E76', NL: '#9EB9D8', EN: '#9EB9D8', DE: '#4C2E76' };

const getSentimentData = (t) => [
  { name: t('municipality.analytics.positive'), value: 58 },
  { name: t('municipality.analytics.neutral'), value: 24 },
  { name: t('municipality.analytics.negative'), value: 12 },
  { name: t('municipality.analytics.mixed'), value: 6 },
];
const getSentimentColors = (t) => ({
  [t('municipality.analytics.positive')]: '#4C2E76',
  [t('municipality.analytics.negative')]: '#C97B63',
  [t('municipality.analytics.neutral')]: '#B8AFA3',
  [t('municipality.analytics.mixed')]: '#D9B26F',
});

const getTopicData = (t) => [
  { name: t('municipality.analytics.passport'), value: 35 },
  { name: t('municipality.analytics.idCard'), value: 25 },
  { name: t('municipality.analytics.certificate'), value: 22 },
  { name: t('municipality.analytics.parking'), value: 10 },
  { name: t('municipality.analytics.other'), value: 8 },
];
const TOPIC_COLORS = ['#4C2E76', '#4C8C7A', '#9EB9D8', '#C7D6AF', '#E4DFD3'];

const CALLS_OVER_TIME = [
  { label: 'Jun 1', calls: 18 }, { label: 'Jun 2', calls: 24 }, { label: 'Jun 3', calls: 31 },
  { label: 'Jun 4', calls: 28 }, { label: 'Jun 5', calls: 42 }, { label: 'Jun 6', calls: 35 },
  { label: 'Jun 7', calls: 12 }, { label: 'Jun 8', calls: 22 }, { label: 'Jun 9', calls: 38 },
  { label: 'Jun 10', calls: 45 },
];

const NODE_W = 180, NODE_H = 52, CANVAS_W = 480, CANVAS_H = 460;

const getFlowNodes = (t) => [
  { id: 'trigger', type: 'trigger', label: t('municipality.flow.passportRenewal'), sublabel: t('municipality.flow.phrases'), cx: 240, cy: 26, bg: '#EEF3F0', iconColor: '#4C2E76', icon: 'bolt' },
  { id: 'ask', type: 'ask', label: t('municipality.flow.ask'), sublabel: t('municipality.flow.whatTypeDocument'), cx: 240, cy: 106, bg: '#EEF3F0', iconColor: '#4C2E76', icon: 'help_outline' },
  { id: 'decision', type: 'decision', label: t('municipality.flow.decision'), sublabel: t('municipality.flow.stolenOrLost'), cx: 240, cy: 190, bg: '#F6F1E7', iconColor: '#8C6D3F', icon: 'account_tree' },
  { id: 'info', type: 'info', label: t('municipality.flow.info'), sublabel: t('municipality.flow.filePoliceReport'), cx: 120, cy: 290, bg: '#EEF3F0', iconColor: '#4C2E76', icon: 'info', clickable: true },
  { id: 'transfer', type: 'transfer', label: t('municipality.flow.transfer'), sublabel: t('municipality.flow.documentService'), cx: 360, cy: 290, bg: '#F1EEF6', iconColor: '#5B4E77', icon: 'phone_forwarded' },
  { id: 'end', type: 'end', label: t('municipality.flow.end'), sublabel: t('municipality.flow.conversationEnds'), cx: 240, cy: 390, bg: '#F5F4F1', iconColor: '#6b6459', icon: 'stop_circle' },
];

const getFlowEdges = (t) => [
  { from: 'trigger', to: 'ask' },
  { from: 'ask', to: 'decision' },
  { from: 'decision', to: 'info', label: t('municipality.flow.stolen') },
  { from: 'decision', to: 'transfer', label: t('municipality.flow.lost') },
  { from: 'info', to: 'end' },
  { from: 'transfer', to: 'end' },
];

// ── Animated counter ──

const useCountUp = (end, duration = 2000, inView = false, decimals = 0) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * end).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, end, duration, decimals]);
  return value;
};

// ── Waveform (subdued, used only while the inline voice demo is active) ──

const Waveform = ({ active }) => (
  <div className={`md-waveform ${active ? 'md-waveform--active' : ''}`}>
    {active && <div className="md-waveform-glow" />}
    {Array.from({ length: 36 }).map((_, i) => (
      <motion.div
        key={i}
        className="md-waveform-bar"
        animate={active
          ? { scaleY: [0.15, 0.35 + Math.random() * 0.6, 0.15], opacity: [0.3, 0.6 + Math.random() * 0.3, 0.3] }
          : { scaleY: [0.2, 0.5 + Math.random() * 0.3, 0.2] }
        }
        transition={{ duration: active ? 0.7 + Math.random() * 0.8 : 2 + Math.random() * 1.5, repeat: Infinity, ease: 'easeInOut', delay: active ? Math.abs(i - 18) * 0.03 : i * 0.05 }}
      />
    ))}
  </div>
);

// ── Section 1: Live calls panel (hero) ──
// A continuous feed: each caller is answered, resolved (or transferred), then
// scrolls off as a new caller arrives — never the same four names forever.
const CALL_POOL = [
  { name: 'Marie', lang: 'FR' },
  { name: 'Jan', lang: 'NL' },
  { name: 'Sarah', lang: 'EN' },
  { name: 'Thomas', lang: 'FR' },
  { name: 'Anke', lang: 'NL' },
  { name: 'Emily', lang: 'EN' },
  { name: 'Luc', lang: 'FR' },
  { name: 'Sven', lang: 'NL' },
  { name: 'Julia', lang: 'EN' },
  { name: 'Nadia', lang: 'FR' },
];

const LiveCallsPanel = ({ inView, t }) => {
  const [rows, setRows] = useState(() =>
    CALL_POOL.slice(0, 4).map((c, i) => ({ id: `seed-${i}`, ...c, state: 'answered' }))
  );
  const poolIndex = useRef(4);

  useEffect(() => {
    if (!inView) return;
    const timer = setInterval(() => {
      setRows((prev) => {
        const [first, ...rest] = prev;
        if (first.state === 'answered') {
          const nextState = Math.random() < 0.75 ? 'resolved' : 'transferred';
          return [{ ...first, state: nextState }, ...rest];
        }
        const caller = CALL_POOL[poolIndex.current % CALL_POOL.length];
        poolIndex.current += 1;
        return [...rest, { id: `${caller.name}-${poolIndex.current}`, ...caller, state: 'answered' }];
      });
    }, 2400);
    return () => clearInterval(timer);
  }, [inView]);

  return (
    <div className="brand-live-panel">
      <div className="brand-live-panel-head">{t('brand.hero.liveLabel')}</div>
      <div className="brand-live-panel-body">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div
              className="brand-live-row"
              key={r.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              <span className="brand-live-name">{r.name}</span>
              <span className="brand-live-lang">{r.lang}</span>
              <span className={`brand-pill brand-pill--${r.state}`}>
                {t(`brand.liveCalls.${r.state}`)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── Section 2: From call to outcome ──

const JOURNEY_STEPS = ['call', 'understand', 'language', 'information', 'action', 'human', 'outcome'];

const JourneySteps = ({ inView, t }) => (
  <div className="brand-journey-row">
    {JOURNEY_STEPS.map((step, i) => (
      <React.Fragment key={step}>
        <motion.div
          className="brand-journey-step"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: i * 0.08 }}
        >
          <span className="brand-journey-index">{i + 1}</span>
          <span className="brand-journey-label">{t(`brand.journey.steps.${step}`)}</span>
        </motion.div>
        {i < JOURNEY_STEPS.length - 1 && <span className="brand-journey-arrow" aria-hidden="true">→</span>}
      </React.Fragment>
    ))}
  </div>
);

// ── Looping single conversation (reused in Proof section) ──

const LoopingConversation = ({ inView, t }) => {
  const conversation = getConversation(t);
  const [visibleCount, setVisibleCount] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setVisibleCount(0);
    const timers = [];
    conversation.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), i * 1400));
    });
    timers.push(setTimeout(() => { setVisibleCount(0); setCycle((c) => c + 1); }, conversation.length * 1400 + 3000));
    return () => timers.forEach(clearTimeout);
  }, [inView, cycle]);

  return (
    <div className="md-card-body">
      <AnimatePresence mode="popLayout">
        {conversation.slice(0, visibleCount).map((msg, i) => (
          <motion.div
            key={`${cycle}-${i}`}
            className={`md-bubble md-bubble--${msg.role}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <span className="md-bubble-label">{msg.role === 'citizen' ? t('municipality.citizen') : t('municipality.assistant')}</span>
            <p>{msg.text}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ── Flow editor mock + info panel (reused in Proof section) ──

const FlowEditorMock = ({ inView, onNodeClick, onActiveNode, t }) => {
  const flowNodes = getFlowNodes(t);
  const flowEdges = getFlowEdges(t);
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const interval = setInterval(() => {
      setActiveIdx(i);
      onActiveNode?.(flowNodes[i]);
      i++;
      if (i >= flowNodes.length) i = 0;
    }, 900);
    return () => clearInterval(interval);
  }, [inView]);

  const getBottom = (n) => ({ x: n.cx, y: n.cy + NODE_H });
  const getTop = (n) => ({ x: n.cx, y: n.cy });

  return (
    <div className="md-flow-editor">
      <div className="md-flow-toolbar">
        <span className="md-flow-toolbar-label">{t('municipality.flow.flowName')}</span>
      </div>
      <div className="md-flow-canvas" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <svg className="md-flow-svg" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="xMidYMid meet">
          {flowEdges.map((edge, i) => {
            const from = flowNodes.find((n) => n.id === edge.from);
            const to = flowNodes.find((n) => n.id === edge.to);
            const p1 = getBottom(from);
            const p2 = getTop(to);
            const midY = (p1.y + p2.y) / 2;
            return (
              <g key={i}>
                <motion.path
                  d={`M${p1.x},${p1.y} C${p1.x},${midY} ${p2.x},${midY} ${p2.x},${p2.y}`}
                  fill="none" stroke="#B7AF9E" strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                />
                {edge.label && (() => {
                  const lx = (p1.x + p2.x) / 2, ly = midY;
                  return (
                    <motion.g initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.6 + i * 0.1 }}>
                      <rect x={lx - 26} y={ly - 10} width={52} height={20} rx={10} fill="#4C2E76" />
                      <text x={lx} y={ly + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">{edge.label}</text>
                    </motion.g>
                  );
                })()}
              </g>
            );
          })}
        </svg>
        {flowNodes.map((node, i) => {
          const isActive = i === activeIdx;
          return (
            <motion.div
              key={node.id}
              className={`md-flow-node ${isActive ? 'md-flow-node--active' : ''} ${node.clickable ? 'md-flow-node--clickable' : ''}`}
              style={{ left: node.cx - NODE_W / 2, top: node.cy, width: NODE_W, background: node.bg }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.08 }}
              onClick={node.clickable ? () => onNodeClick?.(node) : undefined}
            >
              <div className="md-flow-node-header">
                <span className="md-flow-node-title">{node.label}</span>
              </div>
              <div className="md-flow-node-sub">{node.sublabel}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const InfoPanel = ({ open, onClose, t }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="md-info-panel"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 320, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="md-info-panel-header">
          <strong>{t('municipality.infoPanel.title')}</strong>
          <button className="md-info-panel-close" onClick={onClose}><CloseOutlined /></button>
        </div>
        <div className="md-info-panel-body">
          <Collapse defaultActiveKey={['content', 'docs']} ghost size="small" items={[
            {
              key: 'content',
              label: <span style={{ fontWeight: 600, fontSize: 12 }}>{t('municipality.infoPanel.content')}</span>,
              children: (
                <>
                  <Input.TextArea value={t('municipality.infoPanel.contentText')} rows={2} readOnly style={{ marginBottom: 8, background: '#fff', fontSize: 12 }} />
                  <div>
                    <label style={{ display: 'block', marginBottom: 2, fontWeight: 500, fontSize: 11 }}>{t('municipality.infoPanel.contactEmail')}</label>
                    <Input value="documents@commune.be" readOnly size="small" />
                  </div>
                </>
              ),
            },
            {
              key: 'docs',
              label: <span style={{ fontWeight: 600, fontSize: 12 }}>{t('municipality.infoPanel.documents')}</span>,
              children: (
                <>
                  {['Passport_Renewal_Guide.pdf', 'Required_Documents.docx'].map((name) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 6 }}>
                      <FileTextOutlined style={{ color: '#4C2E76', fontSize: 12 }} />
                      <span style={{ fontSize: 11 }}>{name}</span>
                    </div>
                  ))}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <BookOutlined style={{ color: '#5B4E77', fontSize: 12 }} />
                    <span style={{ fontWeight: 500, fontSize: 11 }}>{t('municipality.infoPanel.glossary')}</span>
                  </div>
                  <Input.TextArea value={t('municipality.infoPanel.glossaryText')} rows={3} readOnly style={{ fontFamily: 'monospace', fontSize: 10, background: '#fff' }} />
                </>
              ),
            },
          ]} />
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Section 7: Visibility — reused analytics ──

const AnalyticsCharts = ({ inView, t }) => {
  const topicData = getTopicData(t);
  const languageData = getLanguageData();
  const sentimentData = getSentimentData(t);
  const sentimentColors = getSentimentColors(t);

  return (
    <div className="md-analytics">
      <motion.div className="md-analytics-top" initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.1 }}>
        <Card className="md-chart-card" title={<span className="md-chart-label">{t('municipality.analytics.topics')}</span>}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={topicData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {topicData.map((_, i) => <Cell key={i} fill={TOPIC_COLORS[i]} />)}
              </Pie>
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="md-chart-card" title={<span className="md-chart-label">{t('municipality.analytics.language')}</span>}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={languageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {languageData.map((entry, i) => <Cell key={i} fill={LANGUAGE_COLORS[entry.name]} />)}
              </Pie>
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="md-chart-card" title={<span className="md-chart-label">{t('municipality.analytics.sentiment')}</span>}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {sentimentData.map((entry, i) => <Cell key={i} fill={sentimentColors[entry.name]} />)}
              </Pie>
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      <motion.div className="md-analytics-bottom" initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.3 }}>
        <Card className="md-kpi-card">
          <Statistic title={t('municipality.analytics.callsThisMonth')} value={287} suffix="/ 1000" valueStyle={{ color: '#4C2E76', fontSize: 28, fontWeight: 600 }} />
          <Progress percent={29} strokeColor="#4C2E76" style={{ marginTop: 12 }} />
          <div className="md-kpi-sub">713 {t('municipality.analytics.remaining')}</div>
        </Card>
        <Card className="md-chart-card" title={<span className="md-chart-label">{t('municipality.analytics.callsOverTime')}</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={CALLS_OVER_TIME}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke="#4C2E76" strokeWidth={2} dot={{ fill: '#4C2E76', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>
    </div>
  );
};

const ROIStats = ({ inView, t }) => {
  const savedHours = useCountUp(1240, 2000, inView);
  const costReduction = useCountUp(67, 2000, inView);
  const callsHandled = useCountUp(94, 2000, inView, 1);
  const citizenSatisfaction = useCountUp(4.6, 2000, inView, 1);
  const stats = [
    { value: savedHours, suffix: 'h', label: t('municipality.staffHoursSaved') },
    { value: costReduction, suffix: '%', label: t('municipality.costReduction') },
    { value: callsHandled, suffix: '%', label: t('municipality.callsHandled') },
    { value: citizenSatisfaction, suffix: '/ 5', label: t('municipality.citizenSatisfaction') },
  ];
  return (
    <div className="md-roi-grid">
      {stats.map((s, i) => (
        <motion.div key={i} className="md-roi-stat" initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: i * 0.1 }}>
          <span className="md-roi-value">{s.value}<span className="md-roi-suffix">{s.suffix}</span></span>
          <span className="md-roi-label">{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
};

// ── Section 8: Industries selector ──

const INDUSTRIES = ['publicSector', 'healthcare', 'property', 'insurance', 'automotive', 'legal'];

const IndustrySelector = ({ t }) => {
  const [active, setActive] = useState('publicSector');
  return (
    <div className="brand-industries">
      <div className="brand-industries-tabs" role="tablist">
        {INDUSTRIES.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={active === key}
            className={`brand-industry-tab ${active === key ? 'brand-industry-tab--active' : ''}`}
            onClick={() => setActive(key)}
          >
            {t(`brand.industries.tabs.${key}`)}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          className="brand-industry-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          <div className="brand-industry-line">
            <span className="brand-industry-tag">{t('municipality.citizen')}</span>
            <p>{t(`brand.industries.examples.${active}.opening`)}</p>
          </div>
          <div className="brand-industry-outcome">
            <CheckCircleFilled />
            <span>{t(`brand.industries.examples.${active}.outcome`)}</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── Section wrapper ──

const Section = ({ children, className = '', id }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref} id={id}
      className={`md-section ${className}`}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      {typeof children === 'function' ? children(inView) : children}
    </motion.section>
  );
};

// ── Main page ──

const MunicipalityDemo = () => {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const octoplanDemoRef = useRef(null);
  const [showDemo, setShowDemo] = useState(false);
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, language, setLanguage } = useTranslation();
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);

  const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const launchDemo = () => {
    setShowDemo(true);
    setTimeout(() => { octoplanDemoRef.current?.startDiscussion(); }, 300);
  };

  const stopDemo = () => {
    octoplanDemoRef.current?.stopDiscussion();
    setShowDemo(false);
  };

  const handleContactSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const client = generateClient();
      const result = await client.graphql({
        query: `mutation SendContactEmail($name: String!, $email: String!, $company: String, $phone: String, $message: String!, $to: String) {
          sendContactEmail(name: $name, email: $email, company: $company, phone: $phone, message: $message, to: $to) { success message messageId }
        }`,
        variables: { ...values, to: CONTACT_EMAIL },
        authMode: 'apiKey',
      });
      if (result.errors?.length) throw new Error(result.errors[0].message);
      if (result.data?.sendContactEmail?.success) {
        message.success(t('contact.successMessage'));
        form.resetFields();
      } else throw new Error(result.data?.sendContactEmail?.message || 'Failed');
    } catch (e) {
      message.error(e?.message || t('contact.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dattivox-landing brand-theme">
      {/* ── Header ── */}
      <header className="top-header">
        <div className="header-content">
          <div className="header-logo">
            <img src="/Dattivox - logo.svg" alt="Dattivox" className="header-logo-img" />
          </div>
          <nav className="brand-nav">
            <button className="brand-nav-link" onClick={() => scrollToSection('journey')}>{t('brand.nav.product')}</button>
            <button className="brand-nav-link" onClick={() => scrollToSection('industries')}>{t('brand.nav.industries')}</button>
            <button className="brand-nav-link" onClick={() => scrollToSection('journey-proof')}>{t('brand.nav.customers')}</button>
            <a className="brand-nav-link" href="#">{t('brand.nav.resources')}</a>
            <button className="brand-nav-link" onClick={() => scrollToSection('about')}>{t('brand.nav.about')}</button>
          </nav>
          <div className="header-actions">
            <button className="brand-cta-header" onClick={() => scrollToSection('contact-section')}>
              {t('brand.nav.bookDemo')}
            </button>
            <Dropdown
              trigger={['click']}
              menu={{
                selectedKeys: [language],
                items: [
                  { key: 'en', label: 'English' },
                  { key: 'fr', label: 'Français' },
                  { key: 'nl', label: 'Nederlands' },
                ],
                onClick: ({ key }) => setLanguage(key),
              }}
            >
              <button className="brand-lang-icon" aria-label={t('brand.nav.language')}>
                <GlobalOutlined />
              </button>
            </Dropdown>
          </div>
        </div>
      </header>

      {/* ── 1. Reassurance (hero) ── */}
      <section className={`brand-hero ${showDemo ? 'brand-hero--active' : ''}`} ref={heroRef}>
        <Waveform active={showDemo} />
        <div className="brand-hero-inner">
          <div className="brand-hero-left">
            {showDemo && (
              <motion.div className="md-listening-pill" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <span className="md-listening-dot" /> {t('municipality.listening')}
              </motion.div>
            )}
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {t('brand.hero.headline')}
            </motion.h1>
            <motion.p className="brand-hero-sub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
              {t('brand.hero.subhead')}
            </motion.p>
            <motion.div className="brand-hero-ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
              <a href={`tel:${TEST_PHONE_NUMBER}`} className="brand-cta-primary"><PhoneOutlined /> {t('brand.hero.ctaCall')}</a>
              <button className="brand-cta-secondary" onClick={() => scrollToSection('journey')}>
                {t('brand.hero.ctaHow')} <ArrowRightOutlined />
              </button>
            </motion.div>
            <div className="brand-hero-checks">
              <span><CheckCircleFilled /> {t('brand.hero.checkAvailable')}</span>
              <span><CheckCircleFilled /> {t('brand.hero.checkMultilingual')}</span>
              <span><CheckCircleFilled /> {t('brand.hero.checkIntegrates')}</span>
            </div>
          </div>
          <div className="brand-hero-right">
            <div className="brand-hero-photo-wrap">
              <img src={receptionistTestimonialPhoto} alt="" className="brand-hero-photo" aria-hidden="true" />
              <blockquote className="brand-hero-quote">
                <p>{t('brand.proof.quote')}</p>
                <cite>{t('brand.proof.quoteAttribution')}</cite>
              </blockquote>
            </div>
            <div className="brand-hero-panel-wrap">
              <LiveCallsPanel inView={heroInView} t={t} />
            </div>
          </div>
        </div>
      </section>

      {showDemo && (
        <div style={{ display: 'none' }}>
          <OctoplanDemo ref={octoplanDemoRef} language={language} />
        </div>
      )}

      {/* ── Integrations strip ── */}
      <div className="brand-integrations-strip">
        <div className="md-container brand-integrations-inner">
          <span className="brand-integrations-label">{t('brand.integrations.label')}</span>
          <div className="brand-integrations-logos">
            <span className="brand-integration-logo">Odoo</span>
            <span className="brand-integration-logo">Crossuite</span>
            <span className="brand-integration-logo brand-integration-logo--muted">{t('brand.integrations.more')}</span>
          </div>
        </div>
      </div>

      {/* ── 2. From call to outcome ── */}
      <Section id="journey" className="brand-section brand-section--soft">
        {(inView) => (
          <div className="md-container">
            <h2 className="brand-title">{t('brand.journey.title')}</h2>
            <p className="brand-subtitle">{t('brand.journey.subtitle')}</p>
            <JourneySteps inView={inView} t={t} />
          </div>
        )}
      </Section>

      {/* ── 3. Human attention ── */}
      <Section className="brand-section brand-human-section">
        {(inView) => (
          <div className="md-container brand-human-grid">
            <motion.div
              className="brand-photo-placeholder"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6 }}
            >
              <img
                src={receptionistWelcomePhoto}
                alt={t('brand.human.photoCaption')}
                className="brand-photo-img"
              />
              <span className="brand-photo-caption">{t('brand.human.photoCaption')}</span>
            </motion.div>
            <div className="brand-human-copy">
              <span className="brand-eyebrow">{t('brand.human.eyebrow')}</span>
              <h2 className="brand-title brand-title--left">{t('brand.human.title')}</h2>
              <p className="brand-body">{t('brand.human.body')}</p>
            </div>
          </div>
        )}
      </Section>

      {/* ── 4. Always there ── */}
      <Section className="brand-section brand-section--soft">
        {(inView) => (
          <div className="md-container">
            <h2 className="brand-title">{t('brand.always.title')}</h2>
            <p className="brand-subtitle">{t('brand.always.subtitle')}</p>
            <motion.div className="brand-always-list" initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
              {[
                { name: 'Marie', lang: 'FR', state: 'answered' },
                { name: 'Jan', lang: 'NL', state: 'answered' },
                { name: 'Sarah', lang: 'EN', state: 'answered' },
                { name: 'Thomas', lang: 'FR', state: 'transferred' },
              ].map((row) => (
                <div className="brand-always-row" key={row.name}>
                  <span className="brand-always-time">09:42</span>
                  <span className="brand-always-name">{row.name}</span>
                  <span className="brand-always-lang">{row.lang}</span>
                  <span className={`brand-pill brand-pill--${row.state}`}>{t(`brand.liveCalls.${row.state}`)}</span>
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </Section>

      {/* ── 5. Know and act ── */}
      <Section className="brand-section">
        {(inView) => (
          <div className="md-container">
            <span className="brand-eyebrow brand-eyebrow--center">{t('brand.knowAct.eyebrow')}</span>
            <h2 className="brand-title">{t('brand.knowAct.title')}</h2>
            <p className="brand-subtitle">{t('brand.knowAct.subtitle')}</p>
            <motion.div className="brand-knowact" initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
              <div className="brand-knowact-request">“{t('brand.knowAct.request')}”</div>
              <div className="brand-knowact-steps">
                {['understand', 'identify', 'calendar', 'propose', 'confirm'].map((step, i) => (
                  <div className="brand-knowact-step" key={step}>
                    <span className="brand-knowact-index">{i + 1}</span>
                    <span>{t(`brand.knowAct.steps.${step}`)}</span>
                  </div>
                ))}
              </div>
              <div className="brand-knowact-outcome"><CheckCircleFilled /> {t('brand.knowAct.steps.outcome')}</div>
            </motion.div>
          </div>
        )}
      </Section>

      {/* ── 6. Human handoff ── */}
      <Section className="brand-section brand-section--soft">
        {(inView) => (
          <div className="md-container">
            <h2 className="brand-title">{t('brand.handoff.title')}</h2>
            <p className="brand-subtitle">{t('brand.handoff.body')}</p>
            <motion.div className="brand-handoff-card" initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
              <div className="brand-handoff-line brand-handoff-line--caller">{t('brand.handoff.customerLine')}</div>
              <div className="brand-handoff-note">{t('brand.handoff.systemNote')}</div>
              <div className="brand-handoff-line brand-handoff-line--human">{t('brand.handoff.humanLine')}</div>
              <div className="brand-handoff-context">{t('brand.handoff.contextNote')}</div>
            </motion.div>
          </div>
        )}
      </Section>

      {/* ── 7. Visibility ── */}
      <Section id="statistics" className="md-stats-section brand-section">
        {(inView) => (
          <div className="md-container">
            <span className="brand-eyebrow brand-eyebrow--center">{t('brand.visibility.eyebrow')}</span>
            <h2 className="brand-title">{t('brand.visibility.title')}</h2>
            <p className="brand-subtitle">{t('brand.visibility.subtitle')}</p>
            <ROIStats inView={inView} t={t} />
            <AnalyticsCharts inView={inView} t={t} />
          </div>
        )}
      </Section>

      {/* ── 8. Industries ── */}
      <Section id="industries" className="brand-section brand-section--soft">
        {() => (
          <div className="md-container">
            <h2 className="brand-title">{t('brand.industries.title')}</h2>
            <IndustrySelector t={t} />
            <p className="brand-footnote brand-footnote--center">{t('brand.industries.tagline')}</p>
          </div>
        )}
      </Section>

      {/* ── Differentiators ── */}
      <Section className="brand-section">
        {() => (
          <div className="md-container">
            <h2 className="brand-title">{t('brand.different.title')}</h2>
            <div className="brand-diff-grid">
              <div className="brand-diff-item">
                <SettingOutlined />
                <strong>{t('brand.different.configure.title')}</strong>
                <span>{t('brand.different.configure.body')}</span>
              </div>
              <div className="brand-diff-item">
                <ApiOutlined />
                <strong>{t('brand.different.integrate.title')}</strong>
                <span>{t('brand.different.integrate.body')}</span>
              </div>
              <div className="brand-diff-item">
                <ThunderboltOutlined />
                <strong>{t('brand.different.telephony.title')}</strong>
                <span>{t('brand.different.telephony.body')}</span>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ── 9. Customer stories (proof) ── */}
      <Section id="journey-proof" className="brand-section brand-stories-section">
        {() => (
          <div className="md-container">
            <span className="brand-eyebrow brand-eyebrow--center">{t('brand.stories.eyebrow')}</span>
            <h2 className="brand-title">{t('brand.stories.title')}</h2>
          </div>
        )}
      </Section>

      {/* Story 1 — Uccle */}
      <Section className="brand-section brand-story">
        {(inView) => (
          <div className="md-container brand-story-grid">
            <motion.div
              className="brand-photo-placeholder brand-story-photo brand-story-photo--full"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6 }}
            >
              <img src={uccleReceptionPhoto} alt={t('brand.stories.uccle.photoCaption')} className="brand-photo-img brand-photo-img--contain" />
            </motion.div>

            <div className="brand-story-copy">
              <span className="brand-eyebrow">{t('brand.stories.uccle.eyebrow')}</span>
              <h3 className="brand-story-headline">{t('brand.stories.uccle.headline')}</h3>
              <p className="brand-story-outcome">{t('brand.stories.uccle.outcome')}</p>
              <p className="brand-story-proof">{t('brand.stories.uccle.proof')}</p>
            </div>
          </div>
        )}
      </Section>

      {/* Story 2 — Smiles by Maria (text-only until a real photo is supplied) */}
      <Section className="brand-section brand-section--soft brand-story">
        {() => (
          <div className="md-container brand-story-copy brand-story-copy--solo">
            <span className="brand-eyebrow">{t('brand.stories.maria.eyebrow')}</span>
            <h3 className="brand-story-headline">{t('brand.stories.maria.headline')}</h3>
            <p className="brand-story-outcome">{t('brand.stories.maria.outcome')}</p>
            <p className="brand-story-proof brand-story-proof--placeholder">{t('brand.stories.maria.proof')}</p>
          </div>
        )}
      </Section>

      {/* Stories connecting line */}
      <Section className="brand-section brand-stories-closing">
        {() => (
          <div className="md-container">
            <p className="brand-stories-tagline">{t('brand.stories.tagline1')}</p>
            <p className="brand-stories-tagline brand-stories-tagline--accent">{t('brand.stories.tagline2')}</p>
          </div>
        )}
      </Section>

      {/* ── Origin story ── */}
      <Section id="about" className="brand-section brand-origin">
        {(inView) => (
          <div className="md-container brand-origin-grid">
            <motion.div className="brand-origin-copy" initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
              <span className="brand-eyebrow">{t('brand.origin.eyebrow')}</span>
              <h2 className="brand-title brand-title--left">{t('brand.origin.title')}</h2>
              <p className="brand-body">{t('brand.origin.p1')}</p>
              <p className="brand-body">{t('brand.origin.p2')}</p>
              <p className="brand-origin-question">{t('brand.origin.question')}</p>
            </motion.div>
          </div>
        )}
      </Section>

      {/* ── About / team ── */}
      <Section className="brand-section brand-section--soft">
        {() => (
          <div className="md-container">
            <h2 className="brand-title">{t('brand.team.title')}</h2>
            <p className="brand-subtitle">{t('brand.team.subtitle')}</p>
            <div className="brand-team-grid">
              {['sergio', 'nathan', 'elie', 'hugues'].map((person) => (
                <div className="brand-team-card" key={person}>
                  <div className="brand-team-avatar" aria-hidden="true">{t(`brand.team.people.${person}.initial`)}</div>
                  <strong>{t(`brand.team.people.${person}.name`)}</strong>
                  <span className="brand-team-role">{t(`brand.team.people.${person}.role`)}</span>
                  <p className="brand-team-quote">&ldquo;{t(`brand.team.people.${person}.quote`)}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── 10. Experience Dattivox (closing) ── */}
      <Section className="brand-closing">
        {() => (
          <div className="md-container brand-closing-inner">
            <h2 className="brand-title brand-title--light">{t('brand.experience.title')}</h2>
            <div className="brand-closing-actions">
              <a href={`tel:${TEST_PHONE_NUMBER}`} className="brand-cta-primary brand-cta-primary--light">
                <PhoneOutlined /> {t('brand.experience.callLabel')} {DISPLAY_PHONE}
              </a>
              <span className="brand-closing-or">{t('brand.experience.or')}</span>
              <button className="brand-cta-secondary brand-cta-secondary--light" onClick={() => scrollToSection('contact-section')}>
                {t('brand.experience.bookDemo')}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ── Contact ── */}
      <section id="contact-section" className="contact-section">
        <div className="section-container">
          <div className="section-header">
            <h2>{t('contact.title')}</h2>
            <p>{t('contact.subtitle')}</p>
          </div>
          <motion.div className="contact-form-container" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }}>
            <Form form={form} layout="vertical" onFinish={handleContactSubmit} className="contact-form">
              <Form.Item name="name" label={t('contact.name')} rules={[{ required: true, message: t('contact.nameRequired') }]}>
                <Input size="large" placeholder={t('contact.namePlaceholder')} />
              </Form.Item>
              <Form.Item name="email" label={t('contact.email')} rules={[{ required: true, message: t('contact.emailRequired') }, { type: 'email', message: t('contact.emailInvalid') }]}>
                <Input size="large" placeholder={t('contact.emailPlaceholder')} />
              </Form.Item>
              <Form.Item name="company" label={t('contact.company')}>
                <Input size="large" placeholder={t('contact.companyPlaceholder')} />
              </Form.Item>
              <Form.Item name="phone" label={t('contact.phone')}>
                <Input size="large" placeholder={t('contact.phonePlaceholder')} />
              </Form.Item>
              <Form.Item name="message" label={t('contact.message')} rules={[{ required: true, message: t('contact.messageRequired') }]}>
                <TextArea rows={4} placeholder={t('contact.messagePlaceholder')} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" size="large" loading={isSubmitting} className="submit-button" block>
                  {t('contact.sendMessage')}
                </Button>
              </Form.Item>
            </Form>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer brand-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/Dattivox - logo.svg" alt="Dattivox" className="footer-logo-img" />
          </div>
          <div className="footer-links">
            <a href="/terms">{t('footer.terms')}</a>
            <a href="/privacy">{t('footer.privacy')}</a>
          </div>
          <p className="footer-copyright">{t('footer.copyright')}</p>
          <div className="footer-company">
            <div className="company-info">
              <a href="https://dattico.com" target="_blank" rel="noopener noreferrer" className="dattico-link">
                <span>{t('footer.madeBy')}</span>
              </a>
              <p>Rue des Pères Blancs 4, 1040 Bruxelles</p>
              <p>+32 2 882 17 45</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MunicipalityDemo;
