import React, { useState, useEffect } from 'react';
import { getDocs } from 'firebase/firestore';
import { Col } from '../lib/tenant';
import { Card, Button, cn } from '../components/UI';
import { Check, Wifi, Zap, Shield, Headphones } from 'lucide-react';
import { Plan } from '../types';
import { motion } from 'motion/react';

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(Col.plans());
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan)));
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Suporta tanto imagemUrl (novo) quanto imageUrl (legado)
  const getImage = (plan: Plan) => plan.imagemUrl || plan.imageUrl;

  return (
    <div className="space-y-8">
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900">Nossos Planos</h1>
        <p className="text-slate-500 mt-2">Escolha a velocidade ideal para sua casa ou empresa com a ultravelocidade da VgWeb.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={cn(
                "relative overflow-hidden p-0 flex flex-col h-full transition-all hover:shadow-xl hover:-translate-y-1",
                plan.popular && "border-2 border-primary ring-4 ring-primary/10"
              )}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold uppercase px-3 py-1 rounded-bl-xl z-10">
                    Mais Popular
                  </div>
                )}

                {/* ── Imagem inteira (object-contain, fundo escuro) ── */}
                <div style={{
                  width: '100%',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '180px',
                }}>
                  {getImage(plan) ? (
                    <img
                      src={getImage(plan)}
                      alt={plan.nome}
                      referrerPolicy="no-referrer"
                      style={{
                        width:      '100%',
                        display:    'block',
                        objectFit:  'contain',   // imagem completa, sem corte
                        maxHeight:  '260px',
                      }}
                    />
                  ) : (
                    <div style={{ height: '180px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      className="bg-gradient-to-br from-primary/20 to-primary/5">
                      <Wifi className="h-12 w-12 text-primary/30" />
                    </div>
                  )}
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{plan.nome}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-sm font-medium text-slate-500">R$</span>
                      <span className="text-4xl font-extrabold text-slate-900">{plan.valor.toFixed(2).split('.')[0]}</span>
                      <span className="text-lg font-bold text-slate-900">,{plan.valor.toFixed(2).split('.')[1]}</span>
                      <span className="text-sm font-medium text-slate-500">/mês</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Velocidade</p>
                        <p className="font-bold text-slate-700">{plan.velocidade}</p>
                      </div>
                    </div>

                    <ul className="space-y-3">
                      {plan.beneficios.map((b, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-slate-600">
                          <div className="mt-1 h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Check className="h-2.5 w-2.5 text-emerald-600" />
                          </div>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button variant={plan.popular ? "primary" : "outline"} className="w-full py-6 text-lg">
                    Contratar Agora
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3 pt-12">
        <div className="text-center p-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
            <Wifi className="h-6 w-6" />
          </div>
          <h4 className="font-bold text-slate-900">Fibra Óptica</h4>
          <p className="text-sm text-slate-500 mt-2">Conexão estável e ultraveloz com tecnologia 100% fibra.</p>
        </div>
        <div className="text-center p-6">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
            <Shield className="h-6 w-6" />
          </div>
          <h4 className="font-bold text-slate-900">Segurança</h4>
          <p className="text-sm text-slate-500 mt-2">Navegação segura para toda sua família com proteção ativa.</p>
        </div>
        <div className="text-center p-6">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-4">
            <Headphones className="h-6 w-6" />
          </div>
          <h4 className="font-bold text-slate-900">Suporte 24h</h4>
          <p className="text-sm text-slate-500 mt-2">Equipe técnica especializada pronta para te atender sempre.</p>
        </div>
      </div>
    </div>
  );
};
