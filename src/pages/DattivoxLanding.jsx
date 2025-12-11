import React, { useState } from 'react';
import { Form, Input, Button, message, Space } from 'antd';
import { PhoneOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import OctoplanDemo from '../../Demo/OctoplanDemo';
import './DattivoxLanding.css';

const { TextArea } = Input;

// Configuration constants
const TEST_PHONE_NUMBER = import.meta.env.VITE_TEST_PHONE || '+32 2 123 45 67';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'hello@dattico.com';

const DattivoxLanding = () => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      // Call API endpoint to send email
      const response = await fetch('/api/contact', {
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
        message.success('Message sent successfully! We\'ll get back to you soon.');
        form.resetFields();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      message.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dattivox-landing">
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
              Dattivox — Your 24/7 Virtual Secretary for Calls
            </motion.h1>
            
            <motion.p 
              className="hero-subtitle"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Dattivox handles phone calls day and night.
              It answers, understands the caller's request, and executes workflows —
              everything a real secretary would do, 24/7 and without delays.
            </motion.p>

            <motion.a 
              href={`tel:${TEST_PHONE_NUMBER}`}
              className="test-number"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <PhoneOutlined /> Test number: {TEST_PHONE_NUMBER}
            </motion.a>

            <motion.div 
              className="hero-buttons"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <Button 
                type="primary" 
                size="large"
                className="cta-primary"
                onClick={() => scrollToSection('demo-section')}
              >
                Try the Voice Demo <ArrowRightOutlined />
              </Button>
              <Button 
                size="large"
                className="cta-secondary"
                onClick={() => scrollToSection('contact-section')}
              >
                Contact Us
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo-section" className="demo-section">
        <div className="section-container">
          <OctoplanDemo />
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
            <h2>Your 24/7 Virtual Secretary</h2>
          </motion.div>

          <div className="features-grid">
            {[
              {
                title: "A 24/7 virtual secretary for phone calls",
                description: "Never miss a call again with round-the-clock availability"
              },
              {
                title: "Handles calls instantly, with no waiting time",
                description: "Immediate response to every caller, ensuring professional service"
              },
              {
                title: "Understands requests and completes tasks",
                description: "Intelligent processing of caller needs and automated task execution"
              },
              {
                title: "Books appointments and routes information",
                description: "Seamless scheduling and information management for your business"
              },
              {
                title: "Connects with your existing systems",
                description: "Easy integration with your current business tools and workflows"
              },
              {
                title: "Works in multiple languages for European markets",
                description: "Multilingual support to serve your diverse customer base"
              }
            ].map((feature, index) => (
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
            <h2>Get Your 24/7 Virtual Secretary</h2>
            <p>
              Want a 24/7 virtual secretary for your business? Tell us about your use case and we'll reach out with next steps.
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
                label="Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input size="large" placeholder="Your name" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input size="large" placeholder="your@email.com" />
              </Form.Item>

              <Form.Item
                name="company"
                label="Company"
              >
                <Input size="large" placeholder="Your company (optional)" />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Phone"
              >
                <Input size="large" placeholder="Your phone number (optional)" />
              </Form.Item>

              <Form.Item
                name="message"
                label="Message"
                rules={[{ required: true, message: 'Please enter your message' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="Tell us about your use case and how a 24/7 virtual secretary could help your business"
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
                  Send message
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
              Terms of Use
            </a>
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </div>
          <p className="footer-copyright">
            © 2024 Dattivox. All rights reserved.
          </p>
          <div className="footer-company">
            <div className="footer-logo">
              <img src="/Dattivox - logo.svg" alt="Dattivox" className="footer-logo-img" />
            </div>
            <div className="company-info">
              <span>Made by Dattico</span>
              <p>Rue des Pères Blancs 4, 1040 Bruxelles</p>
              <p>+32 2 882 17 45</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DattivoxLanding;