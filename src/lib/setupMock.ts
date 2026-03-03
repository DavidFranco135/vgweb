import { db } from './firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';

const mockPlans = [
  { nome: '500MB Giga Fibra', velocidade: '500MB', valor: 99.90, beneficios: ['Wi-Fi 5 Grátis', 'Suporte 24h', 'Instalação Grátis'] },
  { nome: '800MB Giga Ultra', velocidade: '800MB', valor: 129.90, beneficios: ['Wi-Fi 6 Grátis', 'Suporte VIP', 'IP Fixo Opcional'], popular: true },
  { nome: '1 Giga Wi-Fi 6', velocidade: '1GB', valor: 199.90, beneficios: ['Wi-Fi 6 Mesh', 'Prioridade de Tráfego', 'App Premium Grátis'] },
];

export async function setupMockData() {
  try {
    // Add Plans
    for (const plan of mockPlans) {
      await addDoc(collection(db, 'plans'), plan);
    }
    console.log('Mock data initialized successfully');
  } catch (error) {
    console.error('Error initializing mock data:', error);
  }
}
