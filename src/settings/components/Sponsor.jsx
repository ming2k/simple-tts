import React from 'react';
import { Section } from './common';
import styled from 'styled-components';

const SponsorContent = styled.div`
  text-align: center;
  padding: 1rem 0;
`;

const SponsorOptions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1.5rem 0;
`;

const SponsorButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;

  &.github {
    background: #24292e;
    color: white;
    &:hover {
      background: #1b1f23;
    }
  }

  &.coffee {
    background: #ffdd00;
    color: #000000;
    &:hover {
      background: #e5c700;
    }
  }
`;

const ChinesePayment = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
`;

const QRCodes = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 1rem 0;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
  }
`;

const QRCodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const QRCode = styled.img`
  width: 200px;
  height: 200px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }

  @media (max-width: 600px) {
    width: 180px;
    height: 180px;
  }
`;

const PaymentLabel = styled.span`
  font-size: 1rem;
  color: #4a5568;
`;

export function Sponsor() {
  return (
    <Section>
      <h2>Support the Project</h2>
      <SponsorContent>
        <p>If you find this extension helpful, consider supporting its development!</p>
        
        <SponsorOptions>
          <SponsorButton 
            href="https://github.com/sponsors/ming2k" 
            target="_blank" 
            rel="noopener noreferrer"
            className="github"
          >
            ❤️ Sponsor on GitHub
          </SponsorButton>
          
          <SponsorButton 
            href="https://buymeacoffee.com/mingmillenx"
            target="_blank" 
            rel="noopener noreferrer"
            className="coffee"
          >
            ☕ Buy me a coffee
          </SponsorButton>
        </SponsorOptions>

        <ChinesePayment>
          <h3>中国用户赞助方式</h3>
          <QRCodes>
            <QRCodeContainer>
              <QRCode 
                src="https://cdn.jsdelivr.net/gh/ming2k/img-hosting/mings-wechat-payment-pure-qrcode.png" 
                alt="WeChat Pay QR Code" 
              />
              <PaymentLabel>微信支付</PaymentLabel>
            </QRCodeContainer>
            <QRCodeContainer>
              <QRCode 
                src="https://cdn.jsdelivr.net/gh/ming2k/img-hosting/mings-alipay-payment-pure-qrcode.png" 
                alt="Alipay QR Code" 
              />
              <PaymentLabel>支付宝</PaymentLabel>
            </QRCodeContainer>
          </QRCodes>
        </ChinesePayment>
      </SponsorContent>
    </Section>
  );
} 