import { FileText, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

interface NavItem {
  id: 'home' | 'settings';
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'home', label: '发票管理', icon: <FileText className="h-5 w-5" /> },
  { id: 'settings', label: '设置', icon: <Settings className="h-5 w-5" /> },
];

export function Sidebar() {
  const { currentPage, sidebarCollapsed, setCurrentPage, toggleSidebar } = useUIStore();

  return (
    <aside
      className={`
        relative flex flex-col
        bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Logo Area */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        {!sidebarCollapsed && (
          <span className="text-lg font-semibold text-gray-800 truncate">
            发票识别助手
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentPage(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${sidebarCollapsed ? 'justify-center' : ''}
                  `}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="
          absolute -right-3 top-20
          flex items-center justify-center
          w-6 h-6 rounded-full
          bg-white border border-gray-200 shadow-sm
          text-gray-500 hover:text-gray-700
          transition-colors duration-200
        "
        aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
