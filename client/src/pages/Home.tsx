import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Utensils, User, Settings, Menu } from "lucide-react";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";
import ClientInterface from "@/components/ClientInterface";

type View = "client" | "admin";
type AdminState = "login" | "dashboard";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("client");
  const [adminState, setAdminState] = useState<AdminState>("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showClientView = () => {
    setCurrentView("client");
    setMobileMenuOpen(false);
  };

  const showAdminView = () => {
    setCurrentView("admin");
    setAdminState("login");
    setMobileMenuOpen(false);
  };

  const handleAdminLoginSuccess = () => {
    setAdminState("dashboard");
  };

  const handleAdminLogout = () => {
    setAdminState("login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-black shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Utensils className="text-gold-500 text-2xl" />
              <h1 className="text-xl font-bold text-white">Six Dry Aged</h1>
              <span className="text-gold-400 text-sm font-medium">Fidelidade</span>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <Button
                variant="ghost"
                onClick={showClientView}
                className={`text-white hover:text-gold-400 transition-colors duration-200 ${
                  currentView === "client" ? "text-gold-400" : ""
                }`}
              >
                <User className="h-4 w-4 mr-2" />
                Área do Cliente
              </Button>
              <Button
                variant="ghost"
                onClick={showAdminView}
                className={`text-white hover:text-gold-400 transition-colors duration-200 ${
                  currentView === "admin" ? "text-gold-400" : ""
                }`}
              >
                <Settings className="h-4 w-4 mr-2" />
                Painel Admin
              </Button>
            </nav>
            
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900">
            <div className="px-4 py-3 space-y-2">
              <Button
                variant="ghost"
                onClick={showClientView}
                className="block w-full text-left text-white hover:text-gold-400 py-2"
              >
                <User className="h-4 w-4 mr-2" />
                Área do Cliente
              </Button>
              <Button
                variant="ghost"
                onClick={showAdminView}
                className="block w-full text-left text-white hover:text-gold-400 py-2"
              >
                <Settings className="h-4 w-4 mr-2" />
                Painel Admin
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        {currentView === "client" && <ClientInterface />}
        {currentView === "admin" && (
          <>
            {adminState === "login" && (
              <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
            )}
            {adminState === "dashboard" && (
              <AdminDashboard onLogout={handleAdminLogout} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
