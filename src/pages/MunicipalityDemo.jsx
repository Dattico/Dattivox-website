import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Form, Input, Select, message, Card, Statistic, Progress, Collapse, Divider } from 'antd';
import { ArrowRightOutlined, PhoneOutlined, CheckCircleFilled, GlobalOutlined, FileTextOutlined, BookOutlined, UploadOutlined, CloseOutlined } from '@ant-design/icons';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generateClient } from 'aws-amplify/data';
import OctoplanDemo from '../../Demo/OctoplanDemo';
import { useTranslation } from '../hooks/useTranslation';
import './DattivoxLanding.css';
import './MunicipalityDemo.css';

const { TextArea } = Input;
const TEST_PHONE_NUMBER = import.meta.env.VITE_TEST_PHONE || '+32 2 620 61 49';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'hello@dattico.com';

// ── Mock data ──

const getConversation = (t) => [
  { role: 'citizen', text: t('municipality.conversation.msg1') },
  { role: 'assistant', text: t('municipality.conversation.msg2') },
  { role: 'citizen', text: t('municipality.conversation.msg3') },
  { role: 'assistant', text: t('municipality.conversation.msg4') },
  { role: 'citizen', text: t('municipality.conversation.msg5') },
  { role: 'assistant', text: t('municipality.conversation.msg6') },
];

// Analytics mock data — mirrors Analytics.jsx structure
const getLanguageData = () => [
  { name: 'FR', value: 73 },
  { name: 'NL', value: 27 },
];
const LANGUAGE_COLORS = { FR: '#A286B9', NL: '#9EB9D8', EN: '#9EB9D8', DE: '#A286B9' };

const getSentimentData = (t) => [
  { name: t('municipality.analytics.positive'), value: 58 },
  { name: t('municipality.analytics.neutral'), value: 24 },
  { name: t('municipality.analytics.negative'), value: 12 },
  { name: t('municipality.analytics.mixed'), value: 6 },
];
const getSentimentColors = (t) => ({
  [t('municipality.analytics.positive')]: '#34C759',
  [t('municipality.analytics.negative')]: '#FF3B30',
  [t('municipality.analytics.neutral')]: '#8E8E93',
  [t('municipality.analytics.mixed')]: '#FF9500'
});

const getTopicData = (t) => [
  { name: t('municipality.analytics.passport'), value: 35 },
  { name: t('municipality.analytics.idCard'), value: 25 },
  { name: t('municipality.analytics.certificate'), value: 22 },
  { name: t('municipality.analytics.parking'), value: 10 },
  { name: t('municipality.analytics.other'), value: 8 },
];
const TOPIC_COLORS = ['#4C2E76', '#A286B9', '#9EB9D8', '#c4b5d4', '#d9d0e3'];

const CALLS_OVER_TIME = [
  { label: 'Jun 1', calls: 18 },
  { label: 'Jun 2', calls: 24 },
  { label: 'Jun 3', calls: 31 },
  { label: 'Jun 4', calls: 28 },
  { label: 'Jun 5', calls: 42 },
  { label: 'Jun 6', calls: 35 },
  { label: 'Jun 7', calls: 12 },
  { label: 'Jun 8', calls: 22 },
  { label: 'Jun 9', calls: 38 },
  { label: 'Jun 10', calls: 45 },
];

// Node positions in px (absolute within canvas)
const NODE_W = 180;
const NODE_H = 52;
const CANVAS_W = 480;
const CANVAS_H = 460;

const getFlowNodes = (t) => [
  { id: 'trigger', type: 'trigger', label: t('municipality.flow.passportRenewal'), sublabel: t('municipality.flow.phrases'), cx: 240, cy: 26, bg: '#E3F2FD', iconColor: '#1976D2', icon: 'bolt' },
  { id: 'ask', type: 'ask', label: t('municipality.flow.ask'), sublabel: t('municipality.flow.whatTypeDocument'), cx: 240, cy: 106, bg: '#E8F4F8', iconColor: '#0288D1', icon: 'help_outline' },
  { id: 'decision', type: 'decision', label: t('municipality.flow.decision'), sublabel: t('municipality.flow.stolenOrLost'), cx: 240, cy: 190, bg: '#FFF3E0', iconColor: '#F57C00', icon: 'account_tree' },
  { id: 'info', type: 'info', label: t('municipality.flow.info'), sublabel: t('municipality.flow.filePoliceReport'), cx: 120, cy: 290, bg: '#E8F5E9', iconColor: '#388E3C', icon: 'info', clickable: true },
  { id: 'transfer', type: 'transfer', label: t('municipality.flow.transfer'), sublabel: t('municipality.flow.documentService'), cx: 360, cy: 290, bg: '#F3E5F5', iconColor: '#7B1FA2', icon: 'phone_forwarded' },
  { id: 'end', type: 'end', label: t('municipality.flow.end'), sublabel: t('municipality.flow.conversationEnds'), cx: 240, cy: 390, bg: '#f5f5f5', iconColor: '#666', icon: 'stop_circle' },
];

const getFlowEdges = (t) => [
  { from: 'trigger', to: 'ask' },
  { from: 'ask', to: 'decision' },
  { from: 'decision', to: 'info', label: t('municipality.flow.stolen') },
  { from: 'decision', to: 'transfer', label: t('municipality.flow.lost') },
  { from: 'info', to: 'end' },
  { from: 'transfer', to: 'end' },
];

// ── Animated counter hook ──

const useCountUp = (end, duration = 2000, inView = false, decimals = 0) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
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

// ── Waveform background ──

const Waveform = ({ active }) => (
  <div className={`md-waveform ${active ? 'md-waveform--active' : ''}`}>
    {active && <div className="md-waveform-glow" />}
    {Array.from({ length: 48 }).map((_, i) => (
      <motion.div
        key={i}
        className="md-waveform-bar"
        animate={active
          ? {
              scaleY: [0.15, 0.4 + Math.random() * 0.9, 0.15],
              opacity: [0.3, 0.7 + Math.random() * 0.3, 0.3],
            }
          : { scaleY: [0.3, 0.8 + Math.random() * 0.6, 0.3] }
        }
        transition={{
          duration: active ? 0.6 + Math.random() * 0.8 : 1.5 + Math.random() * 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: active ? Math.abs(i - 24) * 0.03 : i * 0.05,
        }}
      />
    ))}
  </div>
);

// ── Looping conversation ──

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
    timers.push(setTimeout(() => {
      setVisibleCount(0);
      setCycle(c => c + 1);
    }, conversation.length * 1400 + 3000));
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

// ── Flow editor mock ──

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
        <span className="material-icons" style={{ fontSize: 16, opacity: 0.5 }}>add_circle_outline</span>
        <span className="md-flow-toolbar-label">{t('municipality.flow.flowName')}</span>
        <span className="md-flow-toolbar-badge">{t('municipality.flow.draft')}</span>
      </div>
      <div className="md-flow-canvas" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <svg className="md-flow-svg" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="xMidYMid meet">
          {flowEdges.map((edge, i) => {
            const from = flowNodes.find(n => n.id === edge.from);
            const to = flowNodes.find(n => n.id === edge.to);
            const p1 = getBottom(from);
            const p2 = getTop(to);
            const midY = (p1.y + p2.y) / 2;
            return (
              <g key={i}>
                <motion.path
                  d={`M${p1.x},${p1.y} C${p1.x},${midY} ${p2.x},${midY} ${p2.x},${p2.y}`}
                  fill="none" stroke="#F57C00" strokeWidth="3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                />
                {edge.label && (() => {
                  const lx = (p1.x + p2.x) / 2;
                  const ly = midY;
                  return (
                    <motion.g initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.6 + i * 0.1 }}>
                      <rect x={lx - 26} y={ly - 10} width={52} height={20} rx={10} fill="#F57C00" />
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
              {node.type !== 'trigger' && <div className="md-handle md-handle--top" />}
              <div className="md-flow-node-header">
                <span className="material-icons" style={{ fontSize: 16, color: node.iconColor }}>{node.icon}</span>
                <span className="md-flow-node-title">{node.label}</span>
              </div>
              <div className="md-flow-node-sub">{node.sublabel}</div>
              {node.type !== 'end' && <div className="md-handle md-handle--bottom" />}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ── Info panel (animated, inside flow editor) ──

const InfoPanel = ({ open, onClose, t }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="md-info-panel"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 340, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="md-info-panel-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 16, color: '#388E3C' }}>info</span>
            <strong>{t('municipality.infoPanel.title')}</strong>
          </span>
          <button className="md-info-panel-close" onClick={onClose}><CloseOutlined /></button>
        </div>
        <div className="md-info-panel-body">
          <Collapse defaultActiveKey={['content', 'docs']} ghost size="small" items={[
            {
              key: 'content',
              label: <span style={{ fontWeight: 600, fontSize: 12 }}>{t('municipality.infoPanel.content')}</span>,
              children: (
                <>
                  <Input.TextArea
                    value={t('municipality.infoPanel.contentText')}
                    rows={2} readOnly style={{ marginBottom: 8, background: '#fff', fontSize: 12 }}
                  />
                  <div>
                    <label style={{ display: 'block', marginBottom: 2, fontWeight: 500, fontSize: 11 }}>{t('municipality.infoPanel.contactEmail')}</label>
                    <Input value="documents@commune.be" readOnly prefix="📧" size="small" />
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
                      <FileTextOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                      <span style={{ fontSize: 11 }}>{name}</span>
                    </div>
                  ))}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <BookOutlined style={{ color: '#722ed1', fontSize: 12 }} />
                    <span style={{ fontWeight: 500, fontSize: 11 }}>{t('municipality.infoPanel.glossary')}</span>
                  </div>
                  <Input.TextArea
                    value={t('municipality.infoPanel.glossaryText')}
                    rows={3} readOnly style={{ fontFamily: 'monospace', fontSize: 10, background: '#fff' }}
                  />
                </>
              ),
            },
          ]} />
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Analytics charts ──

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
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="md-chart-card" title={<span className="md-chart-label">{t('municipality.analytics.language')}</span>}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={languageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
              {languageData.map((entry, i) => <Cell key={i} fill={LANGUAGE_COLORS[entry.name]} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="md-chart-card" title={<span className="md-chart-label">{t('municipality.analytics.sentiment')}</span>}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
              {sentimentData.map((entry, i) => <Cell key={i} fill={sentimentColors[entry.name]} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </motion.div>

    {/* Bottom row: Topics pie + Calls over time line chart */}
    <motion.div className="md-analytics-bottom" initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.3 }}>
      <Card className="md-kpi-card">
        <Statistic title={t('municipality.analytics.callsThisMonth')} value={287} suffix="/ 1000" valueStyle={{ color: '#4C2E76', fontSize: 28, fontWeight: 600 }} />
        <Progress percent={29} strokeColor="#A286B9" style={{ marginTop: 12 }} />
        <div className="md-kpi-sub">713 {t('municipality.analytics.remaining')}</div>
      </Card>

      <Card className="md-chart-card" title={<span className="md-chart-label">{t('municipality.analytics.callsOverTime')}</span>}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={CALLS_OVER_TIME}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="calls" stroke="#A286B9" strokeWidth={2} dot={{ fill: '#A286B9', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </motion.div>
  </div>
  );
};

// ── ROI Statistics (4 key numbers, no cards) ──

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



// ── Section wrapper ──

const Section = ({ children, className = '', id }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref} id={id}
      className={`md-section ${className}`}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
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
    setTimeout(() => {
      octoplanDemoRef.current?.startDiscussion();
    }, 300);
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
    <div className="dattivox-landing">
      {/* ── Header (original classes from DattivoxLanding.css) ── */}
      <header className="top-header">
        <div className="header-content">
          <div className="header-logo">
            <img src="/Dattivox - logo.svg" alt="Dattivox" className="header-logo-img" />
          </div>
          <div className="header-actions">
            <Button className="header-demo-btn" onClick={launchDemo} size="large">
              {t('header.tryDemo')}
            </Button>
            <Button className="header-contact-btn" onClick={() => scrollToSection('contact-section')} size="large">
              {t('header.contactUs')}
            </Button>
            <a href={`tel:${TEST_PHONE_NUMBER}`} className="header-phone-btn">
              <PhoneOutlined /> {t('header.tryDemoCall')}
            </a>
            <Select
              value={language}
              onChange={setLanguage}
              suffixIcon={<GlobalOutlined />}
              className="header-language"
              options={[
                { value: 'en', label: 'EN' },
                { value: 'fr', label: 'FR' },
                { value: 'nl', label: 'NL' },
              ]}
            />
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className={`md-hero ${showDemo ? 'md-hero--active' : ''}`} ref={heroRef}>
        <Waveform active={showDemo} />
        <div className="md-hero-inner">
          <div className="md-hero-left">
            {showDemo && (
              <motion.div
                className="md-listening-pill"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <span className="md-listening-dot" />
                {t('municipality.listening')}
              </motion.div>
            )}
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              {t('municipality.heroTitle')}<br />{t('municipality.heroTitleBreak')}
            </motion.h1>
            <motion.p className="md-hero-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
              {t('municipality.heroSubtitle')}
            </motion.p>
            <AnimatePresence>
              {showDemo && (
                <motion.div className="md-ticker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                  <span className="md-ticker-text">{t('municipality.ticker')}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div className="hero-buttons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.9 }}>
              <Button size="large" className={showDemo ? 'cta-end-call' : 'cta-primary-large'} onClick={showDemo ? stopDemo : launchDemo}>
                {showDemo ? t('municipality.endCall') : t('hero.tryDemo')} {showDemo ? null : <ArrowRightOutlined />}
              </Button>
            </motion.div>
          </div>
          <div className="md-hero-right">
            <div className="md-conversation-card">
              <div className="md-card-header"><PhoneOutlined /> {t('municipality.liveCall')}</div>
              <LoopingConversation inView={heroInView} t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Inline Demo (hidden, no UI — voice only) ── */}
      {showDemo && (
        <div style={{ display: 'none' }}>
          <OctoplanDemo ref={octoplanDemoRef} language={language} />
        </div>
      )}

      {/* ── Journey / Flow editor with inline info panel ── */}
      <Section id="journey" className="md-journey-section">
        {(inView) => (
          <div className="md-container">
            <h2 className="md-title">{t('municipality.journeyTitle')}</h2>
            <p className="md-subtitle">{t('municipality.journeySubtitle')}</p>
            <div className="md-flow-wrapper">
              <FlowEditorMock inView={inView} onNodeClick={() => setInfoDrawerOpen(true)} onActiveNode={(node) => setInfoDrawerOpen(node?.id === 'info')} t={t} />
              <InfoPanel open={infoDrawerOpen} onClose={() => setInfoDrawerOpen(false)} t={t} />
            </div>
          </div>
        )}
      </Section>

      {/* ── Single conversation ── */}
      <Section id="conversations" className="md-conversations-section">
        {(inView) => (
          <div className="md-container">
            <h2 className="md-title">{t('municipality.conversationsTitle')}</h2>
            <p className="md-subtitle">{t('municipality.conversationsSubtitle')}</p>
            <motion.div
              className="md-log-card md-log-card--single"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              <div className="md-log-top">
                <span className="md-log-phone">+32 2 xxx xx 41</span>
                <span className="md-log-time">{t('municipality.analytics.today')}, 09:14</span>
                <span className="md-log-lang">EN</span>
              </div>
              <div className="md-log-row">
                <span className="md-log-label">{t('municipality.intent')}</span>
                <span className="md-log-value">{t('municipality.passportRenewal')}</span>
              </div>
              <div className="md-log-row">
                <span className="md-log-label">{t('municipality.citizen')}</span>
                <span className="md-log-value md-log-italic">{t('municipality.log.citizenSaid')}</span>
              </div>
              <div className="md-log-row">
                <span className="md-log-label">{t('municipality.assistant')}</span>
                <span className="md-log-value">{t('municipality.log.assistantSaid')}</span>
              </div>
              <div className="md-log-outcome">
                <CheckCircleFilled style={{ color: '#34C759' }} /> {t('municipality.appointmentBooked')}
              </div>
            </motion.div>
          </div>
        )}
      </Section>

      {/* ── Analytics: 4 ROI stats on top + charts below ── */}
      <Section id="statistics" className="md-stats-section">
        {(inView) => (
          <div className="md-container">
            <h2 className="md-title">{t('municipality.roiTitle')}</h2>
            <p className="md-subtitle">{t('municipality.roiSubtitle')}</p>
            <ROIStats inView={inView} t={t} />
            <AnalyticsCharts inView={inView} t={t} />
          </div>
        )}
      </Section>

      {/* ── Closing ── */}
      <Section className="md-closing-section">
        {() => (
          <div className="md-container md-closing-inner">
            <h2 className="md-title md-title--light">{t('municipality.closingTitle')}</h2>
            <p className="md-closing-text">
              {t('municipality.closingText')}
            </p>
            <Button className="md-cta-large" onClick={() => scrollToSection('contact-section')}>
              {t('municipality.scheduleDemonstration')} <ArrowRightOutlined />
            </Button>
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

      {/* ── Footer (original classes) ── */}
      <footer className="footer">
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
