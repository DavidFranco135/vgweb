import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, Input, cn } from '../../components/UI';
import { Search, User, Mail, Phone, MapPin, Wifi } from 'lucide-react';
import { UserProfile } from '../../types';

export const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('nome'));
      const querySnapshot = await getDocs(q);
      const clientsData = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setClients(clientsData.filter(c => c.tipo === 'client'));
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-500">Gerencie a base de assinantes da VGWEB</p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscar por nome, e-mail ou CPF..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => (
            <Card key={client.uid} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold">
                  {client.nome.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{client.nome}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" /> {client.email}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" /> {client.telefone || 'N/A'}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Wifi className="h-3 w-3" /> {client.statusConexao}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Ver Detalhes</button>
                <button className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">Financeiro</button>
              </div>
            </Card>
          ))}
          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-slate-500">Nenhum cliente encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
};
