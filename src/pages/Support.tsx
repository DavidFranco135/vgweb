import React from 'react';
import { Card, Button, Input } from '../components/UI';
import { MessageSquare, Phone, HelpCircle, ExternalLink, ChevronRight, Search } from 'lucide-react';
import { motion } from 'motion/react';

export const SupportPage: React.FC = () => {
  const faqs = [
    { q: 'Como alterar a senha do Wi-Fi?', a: 'Você pode alterar através do nosso app na seção de configurações do roteador ou entrando em contato.' },
    { q: 'Minha internet está lenta, o que fazer?', a: 'Tente reiniciar seu roteador retirando da tomada por 30 segundos. Se persistir, abra um chamado.' },
    { q: 'Como solicitar 2ª via da fatura?', a: 'Basta acessar a aba Financeiro aqui no app e baixar o PDF ou copiar o código PIX.' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Suporte</h1>
        <p className="text-slate-500">Estamos aqui para ajudar você</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-emerald-500 text-white border-none flex flex-col justify-between">
          <div>
            <Phone className="h-8 w-8 mb-4 opacity-80" />
            <h3 className="text-xl font-bold">WhatsApp VGWEB</h3>
            <p className="text-emerald-100 text-sm">Atendimento rápido via chat</p>
          </div>
          <Button variant="secondary" className="mt-6 w-full text-emerald-600">
            Falar agora
          </Button>
        </Card>

        <Card className="bg-primary text-white border-none flex flex-col justify-between">
          <div>
            <MessageSquare className="h-8 w-8 mb-4 opacity-80" />
            <h3 className="text-xl font-bold">Abrir Chamado</h3>
            <p className="text-primary-100 text-sm">Nossa equipe técnica irá te atender</p>
          </div>
          <Button variant="secondary" className="mt-6 w-full text-primary">
            Novo chamado
          </Button>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Dúvidas Frequentes</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Pesquisar dúvida..." className="pl-10" />
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <Card key={i} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium text-slate-700">{faq.q}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-6 border-dashed border-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Teste sua velocidade</p>
            <p className="text-sm text-slate-500">Verifique o desempenho da sua conexão</p>
          </div>
        </div>
        <Button variant="outline">Iniciar Teste</Button>
      </Card>
    </div>
  );
};
