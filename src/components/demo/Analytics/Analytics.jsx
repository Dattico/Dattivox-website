import React, { useState, useEffect } from 'react';
import { Card, Statistic, Progress, Spin, DatePicker, Space, Tag, Segmented } from 'antd';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generateClient } from 'aws-amplify/data';
import dayjs from 'dayjs';
import { useTranslation } from '../../utils/LanguageContext';
import './Analytics.css';

const Analytics = () => {
  const { t } = useTranslation('analytics');
  const client = generateClient();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [languageFilter, setLanguageFilter] = useState(null);
  const [sentimentFilter, setSentimentFilter] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [timeGranularity, setTimeGranularity] = useState('day');

  const TIME_DIMENSIONS = [
    { label: t('hour'), value: 'hour', format: (s) => dayjs(s.startTime).format('YYYY-MM-DD HH'), display: (h) => dayjs(h, 'YYYY-MM-DD HH').format('MMM D HH:00') },
    { label: t('day'), value: 'day', format: (s) => dayjs(s.startTime).format('YYYY-MM-DD'), display: (d) => dayjs(d).format('MMM D') },
    { label: t('month'), value: 'month', format: (s) => dayjs(s.startTime).format('YYYY-MM'), display: (m) => dayjs(m).format('MMM YYYY') },
    { label: t('year'), value: 'year', format: (s) => dayjs(s.startTime).format('YYYY'), display: (y) => y }
  ];

  const SENTIMENT_CONFIG = {
    POSITIVE: { color: '#34C759', label: t('positive') },
    NEGATIVE: { color: '#FF3B30', label: t('negative') },
    NEUTRAL: { color: '#8E8E93', label: t('neutral') },
    MIXED: { color: '#FF9500', label: t('mixed') }
  };

  const LANGUAGE_COLORS = {
    en: '#9EB9D8',
    fr: '#A286B9',
    nl: '#9EB9D8',
    de: '#A286B9'
  };

  const monthlyLimit = parseInt(import.meta.env.VITE_MONTHLY_CALL_LIMIT || '1000');

  useEffect(() => {
    fetchSessions();
  }, [dateRange]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await client.models.ConversationSession.list({
        limit: 10000,
        sortDirection: 'DESC'
      });
      
      const filtered = (response.data || [])
        .filter(s => s?.id && s?.startTime)
        .filter(s => {
          const time = dayjs(s.startTime);
          return time.isAfter(dateRange[0]) && time.isBefore(dateRange[1]);
        });
      
      setSessions(filtered);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
    setLoading(false);
  };

  const filteredSessions = sessions.filter(s => 
    (!languageFilter || s.language === languageFilter) &&
    (!sentimentFilter || s.sentiment === sentimentFilter)
  );

  const analytics = {
    byLanguage: {},
    bySentiment: {},
    byDay: {},
    byHour: {},
    totalDuration: 0,
    totalCalls: 0
  };

  filteredSessions.forEach(s => {
    const day = s.startTime.split('T')[0];
    const hour = new Date(s.startTime).getHours();
    
    analytics.byLanguage[s.language] = (analytics.byLanguage[s.language] || 0) + 1;
    analytics.bySentiment[s.sentiment] = (analytics.bySentiment[s.sentiment] || 0) + 1;
    analytics.byDay[day] = (analytics.byDay[day] || 0) + 1;
    analytics.byHour[hour] = (analytics.byHour[hour] || 0) + 1;
    analytics.totalDuration += s.duration || 0;
    analytics.totalCalls++;
  });

  analytics.avgDuration = analytics.totalCalls > 0 ? Math.round(analytics.totalDuration / analytics.totalCalls) : 0;

  const languageData = Object.entries(analytics.byLanguage).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  const sentimentData = Object.entries(analytics.bySentiment).map(([name, value]) => ({ name, value }));
  
  // Time series data based on selected dimension
  const selectedDimension = TIME_DIMENSIONS.find(d => d.value === timeGranularity);
  const aggregated = {};
  
  filteredSessions.forEach(s => {
    const key = selectedDimension.format(s);
    aggregated[key] = (aggregated[key] || 0) + 1;
  });

  let timeSeriesData = Object.entries(aggregated)
    .map(([key, calls]) => ({ 
      label: selectedDimension.display(key), 
      calls,
      sortKey: key 
    }))
    .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));

  const usedCalls = sessions.length;
  const remaining = monthlyLimit - usedCalls;
  const percentUsed = (usedCalls / monthlyLimit) * 100;

  const handleLanguageClick = (data) => {
    setLanguageFilter(languageFilter === data.name ? null : data.name);
  };

  const handleSentimentClick = (data) => {
    setSentimentFilter(sentimentFilter === data.name ? null : data.name);
  };

  if (loading) {
    return <div className="analytics-loading"><Spin size="large" /></div>;
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div className="header-controls">
          <DatePicker.RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="MMM D, YYYY"
            className="date-picker"
          />
          <Space>
            {languageFilter && (
              <Tag closable onClose={() => setLanguageFilter(null)} color="blue">
                {languageFilter}
              </Tag>
            )}
            {sentimentFilter && (
              <Tag closable onClose={() => setSentimentFilter(null)} color="purple">
                {sentimentFilter}
              </Tag>
            )}
          </Space>
        </div>
      </div>

      <div className="top-row">
        <Card className="kpi-card quota-card">
          <Statistic 
            title={t('callsThisMonth')}
            value={usedCalls}
            suffix={`/ ${monthlyLimit}`}
          />
          <Progress 
            percent={Math.round(percentUsed)} 
            status={percentUsed > 90 ? 'exception' : percentUsed > 75 ? 'normal' : 'success'}
            strokeColor={percentUsed > 90 ? '#FF3B30' : '#A286B9'}
          />
          <div className="quota-remaining">{remaining} {t('remaining')}</div>
        </Card>

        <Card className="kpi-card">
          <Statistic 
            title={t('avgDuration')}
            value={analytics.avgDuration}
            suffix="sec"
          />
        </Card>

        <Card className="chart-card" title={t('language')}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={languageData}
                dataKey="value" 
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                onClick={handleLanguageClick}
                cursor="pointer"
              >
                {languageData.map((entry, i) => (
                  <Cell 
                    key={i} 
                    fill={LANGUAGE_COLORS[entry.name.toLowerCase()]}
                    opacity={languageFilter && languageFilter !== entry.name ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="chart-card" title={t('sentiment')}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={sentimentData}
                dataKey="value" 
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                onClick={handleSentimentClick}
                cursor="pointer"
              >
                {sentimentData.map((entry, i) => (
                  <Cell 
                    key={i} 
                    fill={SENTIMENT_CONFIG[entry.name]?.color || '#8E8E93'}
                    opacity={sentimentFilter && sentimentFilter !== entry.name ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="chart-card-full" title={t('callsOverTime')}>
        <ResponsiveContainer width="100%" height={400}>
          {timeGranularity === 'hour' ? (
            <LineChart data={timeSeriesData}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="calls" 
                stroke="#A286B9" 
                strokeWidth={2}
                dot={{ fill: '#A286B9', r: 4 }}
              />
            </LineChart>
          ) : (
            <BarChart data={timeSeriesData}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="calls" fill="#9EB9D8" />
            </BarChart>
          )}
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <Segmented 
            options={[
              { label: t('hour'), value: 'hour' },
              { label: t('day'), value: 'day' },
              { label: t('month'), value: 'month' },
              { label: t('year'), value: 'year' }
            ]} 
            value={timeGranularity}
            onChange={setTimeGranularity}
          />
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
