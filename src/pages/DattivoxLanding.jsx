import React, { useState, useRef } from 'react';
import { Form, Input, Button, message, Space, Select } from 'antd';
import { PhoneOutlined, ArrowRightOutlined, CalendarOutlined, QuestionCircleOutlined, ClockCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import OctoplanDemo from '../../Demo/OctoplanDemo';
import { useTranslation } from '../hooks/useTranslation';
import './DattivoxLanding.css';

const { TextArea } = Input;

// Configuration constants
const TEST_PHONE_NUMBER = import.meta.env.VITE_TEST_PHONE || '+32 2 620 61 49';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'hello@dattico.com';

const DattivoxLanding = () => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const octoplanDemoRef = useRef(null);
  const { t, language, setLanguage } = useTranslation();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const closeDemoModal = () => {
    // Arrêter la discussion si elle est en cours
    if (octoplanDemoRef.current) {
      octoplanDemoRef.current.stopDiscussion();
    }
    setShowDemoModal(false);
  };

  const handleContactSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      // Call API endpoint to send email
      const response = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          to: CONTACT_EMAIL,
        }),
      });

      if (response.ok) {
        message.success(t('contact.successMessage'));
        form.resetFields();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      message.error(t('contact.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      title: t('features.feature1.title'),
      description: t('features.feature1.description')
    },
    {
      title: t('features.feature2.title'),
      description: t('features.feature2.description')
    },
    {
      title: t('features.feature3.title'),
      description: t('features.feature3.description')
    },
    {
      title: t('features.feature4.title'),
      description: t('features.feature4.description')
    },
    {
      title: t('features.feature5.title'),
      description: t('features.feature5.description')
    },
    {
      title: t('features.feature6.title'),
      description: t('features.feature6.description')
    }
  ];

  return (
    <div className="dattivox-landing">
      <div className="language-selector">
        <Select
          value={language}
          onChange={setLanguage}
          suffixIcon={<GlobalOutlined />}
          options={[
            { value: 'en', label: 'EN' },
            { value: 'fr', label: 'FR' }
          ]}
        />
      </div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <motion.div 
            className="hero-glow hero-glow-1"
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="hero-glow hero-glow-2"
            animate={{
              x: [0, -30, 0],
              y: [0, 20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </div>

        <div className="hero-content">
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              className="hero-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <img src="/Dattivox - logo.svg" alt="Dattivox" className="logo" />
            </motion.div>
            
            <motion.h1 
              className="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span itemProp="name">{t('hero.title')}</span>
            </motion.h1>
            
            <motion.p 
              className="hero-subtitle"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              itemProp="description"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div 
              className="test-showcase"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="showcase-header">
                <span className="showcase-badge">{t('hero.liveDemo')}</span>
                <h3>{t('hero.trySecretary')}</h3>
              </div>
              <div className="showcase-description">
                {t('hero.showcaseDescription')}
              </div>
              <a href={`tel:${TEST_PHONE_NUMBER}`} className="test-number" itemProp="telephone">
                <PhoneOutlined /> {TEST_PHONE_NUMBER}
                <br />
                <span className="call-action">{t('hero.tapToCall')}</span>
                <br />
                <span className="free-call-notice">{t('hero.freeCall')}</span>
              </a>
              <div className="showcase-features">
                <div className="feature-item">
                  <CalendarOutlined className="feature-icon" />
                  <span>{t('showcase.bookAppointments')}</span>
                </div>
                <div className="feature-item">
                  <QuestionCircleOutlined className="feature-icon" />
                  <span>{t('showcase.askQuestions')}</span>
                </div>
                <div className="feature-item">
                  <ClockCircleOutlined className="feature-icon" />
                  <span>{t('showcase.available247')}</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="hero-buttons"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <Button 
                size="large"
                className="cta-primary-large"
                onClick={() => setShowDemoModal(true)}
              >
                Try Demo <ArrowRightOutlined />
              </Button>
              <Button 
                size="large"
                className="cta-secondary"
                onClick={() => scrollToSection('contact-section')}
              >
                {t('hero.contactUs')}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2>{t('features.title')}</h2>
          </motion.div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2>{t('about.title')}</h2>
            <p className="section-subtitle">{t('about.subtitle')}</p>
          </motion.div>

          <div className="about-content">
            <motion.div
              className="about-main"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <p className="about-description">{t('about.description')}</p>
            </motion.div>

            <div className="about-grid">
              <motion.div
                className="about-card"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <h3>{t('about.mission')}</h3>
                <p>{t('about.missionText')}</p>
              </motion.div>

              <motion.div
                className="about-card"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <h3>{t('about.expertise')}</h3>
                <p>{t('about.expertiseText')}</p>
              </motion.div>
            </div>

            <motion.div
              className="about-location"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h4>{t('about.location')}</h4>
              <p>{t('about.locationText')}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact-section" className="contact-section">
        <div className="section-container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2>{t('contact.title')}</h2>
            <p>
              {t('contact.subtitle')}
            </p>
          </motion.div>

          <motion.div
            className="contact-form-container"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleContactSubmit}
              className="contact-form"
            >
              <Form.Item
                name="name"
                label={t('contact.name')}
                rules={[{ required: true, message: t('contact.nameRequired') }]}
              >
                <Input size="large" placeholder={t('contact.namePlaceholder')} />
              </Form.Item>

              <Form.Item
                name="email"
                label={t('contact.email')}
                rules={[
                  { required: true, message: t('contact.emailRequired') },
                  { type: 'email', message: t('contact.emailInvalid') }
                ]}
              >
                <Input size="large" placeholder={t('contact.emailPlaceholder')} />
              </Form.Item>

              <Form.Item
                name="company"
                label={t('contact.company')}
              >
                <Input size="large" placeholder={t('contact.companyPlaceholder')} />
              </Form.Item>

              <Form.Item
                name="phone"
                label={t('contact.phone')}
              >
                <Input size="large" placeholder={t('contact.phonePlaceholder')} />
              </Form.Item>

              <Form.Item
                name="message"
                label={t('contact.message')}
                rules={[{ required: true, message: t('contact.messageRequired') }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder={t('contact.messagePlaceholder')}
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large"
                  loading={isSubmitting}
                  className="submit-button"
                  block
                >
                  {t('contact.sendMessage')}
                </Button>
              </Form.Item>
            </Form>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              {t('footer.terms')}
            </a>
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              {t('footer.privacy')}
            </a>
          </div>
          <p className="footer-copyright">
            {t('footer.copyright')}
          </p>
          <div className="footer-company">
            <div className="footer-logo">
              <img src="/Dattivox - logo.svg" alt="Dattivox" className="footer-logo-img" />
            </div>
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

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="demo-modal-overlay" onClick={closeDemoModal}>
          <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
            <button className="demo-modal-close" onClick={closeDemoModal}>
              ×
            </button>
            <OctoplanDemo ref={octoplanDemoRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DattivoxLanding;