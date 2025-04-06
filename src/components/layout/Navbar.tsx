import React, { useState } from 'react';
import { Bell, User, Sun, Moon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { useUser } from '@supabase/auth-helpers-react';

export const Navbar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const user = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="navbar">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-primary">Factory Energy Monitor</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-secondary hover:bg-opacity-50 rounded-full"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-theme-accent" />
            ) : (
              <Moon className="w-5 h-5 text-theme-accent" />
            )}
          </button>
          <button 
            className="p-2 hover:bg-secondary hover:bg-opacity-50 rounded-full"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-secondary" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 hover:bg-secondary hover:bg-opacity-50 rounded-lg"
            >
              <User className="w-5 h-5 text-secondary" />
              <span className="text-sm text-secondary">{user?.email}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 py-2 bg-card rounded-lg shadow-lg border border-border">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-secondary hover:bg-opacity-50 flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
