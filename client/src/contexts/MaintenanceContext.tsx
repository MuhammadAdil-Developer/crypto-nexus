import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';

interface MaintenanceContextType {
    isMaintenanceMode: boolean;
    message: string;
}

const MaintenanceContext = createContext<MaintenanceContextType>({
    isMaintenanceMode: false,
    message: '',
});

export const useMaintenance = () => useContext(MaintenanceContext);

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    const [message, setMessage] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkStatus = async () => {
            try {
                // Skip check if we're already on maintenance page or admin routes
                if (location.pathname === '/maintenance' ||
                    location.pathname.startsWith('/admin') ||
                    location.pathname.startsWith('/6f2c9b681c3b4cf9a8c4-admin-access-control-panel-login')) {
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/system/maintenance/status/`);
                const data = await response.json();

                if (data.success && data.data) {
                    setIsMaintenanceMode(data.data.maintenance_mode);
                    setMessage(data.data.message || '');

                    // Redirect if maintenance mode is on and user cannot access
                    if (data.data.maintenance_mode && !data.data.can_access) {
                        navigate('/maintenance', { replace: true });
                    }
                }
            } catch (error) {
                console.error('Failed to check maintenance status:', error);
            }
        };

        // Check immediately and then every minute
        checkStatus();
        const interval = setInterval(checkStatus, 60000);

        return () => clearInterval(interval);
    }, [location.pathname, navigate]);

    return (
        <MaintenanceContext.Provider value={{ isMaintenanceMode, message }}>
            {children}
        </MaintenanceContext.Provider>
    );
};
