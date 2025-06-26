
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20 w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-blue-300 mb-2">404</CardTitle>
          <h2 className="text-xl text-white">Página no encontrada</h2>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-blue-200/70">
            La página que buscas no existe o ha sido movida.
          </p>
          <p className="text-blue-200/50 text-sm">
            Ruta: {location.pathname}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={goBack}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
