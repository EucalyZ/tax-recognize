import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Sidebar, Header } from './components/layout';
import { HomePage, SettingsPage } from './pages';
import { useUIStore } from './stores/uiStore';
import { useSettingsStore } from './stores/settingsStore';

function App() {
  const { currentPage } = useUIStore();
  const { loadSettings } = useSettingsStore();

  // 应用启动时加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 顶部导航 */}
        <Header />

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto">
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Toast 通知 */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 3000,
        }}
      />
    </div>
  );
}

export default App;
