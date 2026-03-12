import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useLocation } from "wouter";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Menu, LayoutDashboard, ChevronRight, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();

  const menuItems = [
    {
      title: "Projetos",
      subtitle: "Seus projetos",
      icon: <LayoutDashboard className="h-5 w-5 text-gray-500" />,
      path: "/projetos"
    },
    {
      title: "Usuários",
      subtitle: "Gerenciar usuários",
      icon: <User className="h-5 w-5 text-gray-500" />,
      path: "/usuarios"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-indigo-700">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 border-none w-80">
                {/* Header do Drawer */}
                <div className="bg-blue-600 p-8 flex flex-col items-center text-white pt-12">
                  <Avatar className="h-24 w-24 border-4 border-white/20 mb-4">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                    <AvatarFallback className="bg-blue-800 text-white text-2xl">
                      {user?.name?.charAt(0) || <User />}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{user?.name || "Usuário"}</h2>
                  <p className="text-blue-100 text-sm">{user?.email}</p>
                </div>

                {/* Lista de Itens */}
                <div className="py-4">
                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setLocation(item.path)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors border-b border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-gray-100 p-2 rounded-lg">
                          {item.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.subtitle}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  ))}
                </div>

                {/* Footer do Drawer */}
                <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => logout()}
                  >
                    <LogOut className="h-5 w-5" />
                    Sair da conta
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            
            {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />}
            <h1 className="text-xl font-bold">{APP_TITLE}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm hidden md:inline">{user?.name || user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white hover:bg-indigo-700"
              onClick={() => logout()}
            >
              Sair
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="p-0">
            <img 
              src="/images/construcao.jpg" 
              alt="Construção" 
              className="w-full h-64 object-cover"
            />
          </div>
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Controle de Obras</h2>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
              onClick={() => setLocation("/projetos")}
            >
              Ir para Projetos
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
