import React from 'react';
import { Section } from '../common';
import styled from 'styled-components';

const Content = styled.div`
  text-align: center;
`;

const Text = styled.p`
  color: var(--text-secondary);
  margin-bottom: 20px;
`;

const Buttons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const Button = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.9;
  }

  &.github {
    background: #24292e;
    color: white;
  }

  &.coffee {
    background: #ffdd00;
    color: #000;
  }
`;

const Divider = styled.div`
  border-top: 1px solid var(--border);
  padding-top: 24px;
  margin-top: 8px;
`;

const SubTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 16px 0;
`;

const QRCodes = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;

  @media (max-width: 500px) {
    flex-direction: column;
    align-items: center;
  }
`;

const QRItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const QRCode = styled.img`
  width: 160px;
  height: 160px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
`;

const Label = styled.span`
  font-size: 13px;
  color: var(--text-secondary);
`;

export function Sponsor() {
  return (
    <Section>
      <h2>Support</h2>
      <Content>
        <Text>If you find this extension helpful, consider supporting its development.</Text>

        <Buttons>
          <Button href="https://github.com/sponsors/ming2k" target="_blank" rel="noopener noreferrer" className="github">
            Sponsor on GitHub
          </Button>
          <Button href="https://buymeacoffee.com/ming2k" target="_blank" rel="noopener noreferrer" className="coffee">
            Buy me a coffee
          </Button>
        </Buttons>

        <Divider>
          <SubTitle>Chinese Users</SubTitle>
          <QRCodes>
            <QRItem>
              <QRCode src="https://cdn.jsdelivr.net/gh/ming2k/img-hosting/mings-wechat-payment-pure-qrcode.png" alt="WeChat Pay" />
              <Label>WeChat Pay</Label>
            </QRItem>
            <QRItem>
              <QRCode src="https://cdn.jsdelivr.net/gh/ming2k/img-hosting/mings-alipay-payment-pure-qrcode.png" alt="Alipay" />
              <Label>Alipay</Label>
            </QRItem>
          </QRCodes>
        </Divider>
      </Content>
    </Section>
  );
}
