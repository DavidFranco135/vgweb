import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, CreditCard, Headphones, User, LayoutDashboard,
  Users, FileText, Settings, LogOut, Wifi,
  Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { auth, db }    from '../lib/firebase';
import { Doc } from '../lib/tenant';
import { doc, getDoc } from 'firebase/firestore';
import { cn }          from '../components/UI';
import { AvatarCircle } from '../components/AvatarCircle';

// ─────────────────────────────────────────────────────────────────
// Constantes de largura
// ─────────────────────────────────────────────────────────────────
const W_OPEN      = 240;   // sidebar aberta (desktop)
const W_COLLAPSED = 64;    // sidebar recolhida (desktop, só ícones)
const TOPBAR_H    = 56;    // altura da topbar mobile (px)

// ─────────────────────────────────────────────────────────────────
// Hook: logo do admin
// ─────────────────────────────────────────────────────────────────
function useAdminLogo() {
  const [url, setUrl] = useState('');
  useEffect(() => {
    getDoc(Doc.profile())
      .then(s => { if (s.exists() && s.data()?.avatarUrl) setUrl(s.data().avatarUrl); })
      .catch(() => {});
  }, []);
  return url;
}

// ─────────────────────────────────────────────────────────────────
// Componente interno: conteúdo da sidebar
// ─────────────────────────────────────────────────────────────────
interface NavItem { icon: React.ElementType; label: string; path: string }

interface SidebarContentProps {
  items:     NavItem[];
  logoUrl:   string;
  title:     string;
  collapsed: boolean;        // apenas para desktop
  onClose?:  () => void;     // apenas para drawer mobile
}

const SidebarContent: React.FC<SidebarContentProps> = ({ items, logoUrl, title, collapsed, onClose }) => {
  const location = useLocation();
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Cabeçalho */}
      <div className={cn(
        'flex items-center border-b border-slate-100 flex-shrink-0',
        collapsed ? 'justify-center py-4 px-0' : 'gap-3 px-4 py-4',
      )}>
        <AvatarCircle src={logoUrl} size={collapsed ? 34 : 40} shadow="0 2px 8px rgba(0,0,0,0.14)" />
        {!collapsed && (
          <span className="text-base font-bold text-primary truncate leading-tight">{title}</span>
        )}
        {/* Botão fechar apenas na gaveta mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {items.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé */}
      <div className="border-t border-slate-100 p-2 flex-shrink-0">
        <button
          onClick={() => auth.signOut()}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'w-full flex items-center rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors',
            collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Sidebar universal: desktop fixo + mobile gaveta
// Retorna o marginLeft atual para o conteúdo principal usar
// ─────────────────────────────────────────────────────────────────
interface SidebarProps {
  items:    NavItem[];
  logoUrl:  string;
  title:    string;
  /** Callback chamado toda vez que a largura muda */
  onWidthChange: (w: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ items, logoUrl, title, onWidthChange }) => {
  const location                              = useLocation();
  const [mobileOpen,       setMobileOpen    ] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  // Fecha a gaveta mobile ao navegar
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Notifica o pai quando a largura do desktop muda
  useEffect(() => {
    onWidthChange(desktopCollapsed ? W_COLLAPSED : W_OPEN);
  }, [desktopCollapsed]);

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          DESKTOP — sidebar fixa, colapsa para ícones
      ══════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-30 overflow-hidden"
        style={{
          width:      desktopCollapsed ? W_COLLAPSED : W_OPEN,
          transition: 'width 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <SidebarContent
          items={items}
          logoUrl={logoUrl}
          title={title}
          collapsed={desktopCollapsed}
        />

        {/* Botão chevron colapsar/expandir */}
        <button
          onClick={() => setDesktopCollapsed(v => !v)}
          className="absolute -right-3 top-[68px] h-6 w-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors z-50"
          title={desktopCollapsed ? 'Expandir' : 'Minimizar'}
        >
          {desktopCollapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft  className="h-3.5 w-3.5" />
          }
        </button>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          MOBILE — topbar fixa + gaveta deslizante
      ══════════════════════════════════════════════════════════ */}

      {/* Topbar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 bg-white border-b border-slate-200 shadow-sm"
        style={{ height: TOPBAR_H, paddingLeft: 12, paddingRight: 12 }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        <AvatarCircle src={logoUrl} size={32} shadow="0 1px 5px rgba(0,0,0,0.13)" />
        <span className="font-bold text-primary text-base truncate">{title}</span>
      </header>

      {/* Overlay escuro */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
        style={{
          opacity:       mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
        onClick={() => setMobileOpen(false)}
      />

      {/* Gaveta */}
      <aside
        className="md:hidden fixed top-0 left-0 h-full bg-white z-50 shadow-2xl"
        style={{
          width:      W_OPEN,
          transform:  mobileOpen ? 'translateX(0)' : `translateX(-${W_OPEN}px)`,
          transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <SidebarContent
          items={items}
          logoUrl={logoUrl}
          title={title}
          collapsed={false}
          onClose={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
};

// ════════════════════════════════════════════════════════════════
//  LAYOUT DO CLIENTE
// ════════════════════════════════════════════════════════════════
export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const logoUrl = useAdminLogo();
  const [sidebarW, setSidebarW] = useState(W_OPEN);

  const navItems: NavItem[] = [
    { icon: Home,       label: 'Início',     path: '/' },
    { icon: Wifi,       label: 'Planos',     path: '/plans' },
    { icon: CreditCard, label: 'Financeiro', path: '/finance' },
    { icon: Headphones, label: 'Suporte',    path: '/support' },
    { icon: User,       label: 'Perfil',     path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        items={navItems}
        logoUrl={logoUrl}
        title="VgWeb"
        onWidthChange={setSidebarW}
      />
      <main
        className="min-h-screen transition-all duration-300"
        style={{
          // Mobile: não desloca, pois a sidebar é uma gaveta overlay
          // Desktop: desloca exatamente a largura da sidebar
          marginLeft: 0,
          paddingTop: TOPBAR_H,   // espaço para a topbar mobile
        }}
      >
        {/* Wrapper que em desktop tem marginLeft correto */}
        <div
          className="md:transition-all md:duration-[280ms]"
          style={{ marginLeft: 0 }}
          ref={(el) => {
            if (el) {
              // Aplica via JS para funcionar com a transição suave
              const apply = () => {
                const isMd = window.innerWidth >= 768;
                el.style.marginLeft = isMd ? `${sidebarW}px` : '0';
              };
              apply();
              window.addEventListener('resize', apply);
            }
          }}
        >
          <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  LAYOUT DO ADMIN
// ════════════════════════════════════════════════════════════════
export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const logoUrl  = useAdminLogo();
  const [sidebarW, setSidebarW] = useState(W_OPEN);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard',     path: '/admin' },
    { icon: Users,           label: 'Clientes',      path: '/admin/clients' },
    { icon: FileText,        label: 'Faturas',       path: '/admin/invoices' },
    { icon: Headphones,      label: 'Chamados',      path: '/admin/tickets' },
    { icon: Home,            label: 'Planos',        path: '/admin/plans' },
    { icon: Settings,        label: 'Configurações', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        items={navItems}
        logoUrl={logoUrl}
        title="Admin"
        onWidthChange={setSidebarW}
      />
      <main
        className="min-h-screen"
        style={{ paddingTop: TOPBAR_H }}   // espaço topbar mobile
      >
        <div
          className="md:transition-all md:duration-[280ms]"
          ref={(el) => {
            if (el) {
              const apply = () => {
                const isMd = window.innerWidth >= 768;
                el.style.marginLeft = isMd ? `${sidebarW}px` : '0';
              };
              apply();
              window.addEventListener('resize', apply);
            }
          }}
        >
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
