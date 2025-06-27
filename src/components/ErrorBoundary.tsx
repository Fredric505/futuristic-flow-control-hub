
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Don't show error boundary for DOM manipulation errors that are not critical
    const errorMessage = error.message?.toLowerCase() || '';
    const isDOMError = errorMessage.includes('removechild') || 
                       errorMessage.includes('node to be removed') ||
                       errorMessage.includes('not a child of this node') ||
                       errorMessage.includes('portal');
    
    // If it's a DOM error, log it but don't show the error boundary
    if (isDOMError) {
      console.warn('DOM Error caught (non-critical):', error.message);
      return { hasError: false };
    }

    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = error.message?.toLowerCase() || '';
    const isDOMError = errorMessage.includes('removechild') || 
                       errorMessage.includes('node to be removed') ||
                       errorMessage.includes('not a child of this node') ||
                       errorMessage.includes('portal');

    if (isDOMError) {
      console.warn('DOM Error details:', error, errorInfo);
      // Reset the error boundary state for DOM errors
      this.setState({ hasError: false });
      return;
    }

    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  private handleRefresh = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false });
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
          <Card className="bg-black/20 backdrop-blur-xl border border-red-500/20 w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-red-300">Error Inesperado</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-red-200/70">
                Ha ocurrido un error inesperado en la aplicación.
              </p>
              {this.state.error && (
                <p className="text-red-200/50 text-sm break-all">
                  {this.state.error.message}
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRefresh}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recargar
                </Button>
                <Button 
                  onClick={this.handleGoHome}
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
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
