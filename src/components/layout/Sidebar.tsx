import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  Database,
  ChevronDown,
  ChevronRight,
  Building2,
  Globe,
  MapPin,
  Factory,
  Cog,
  Box,
  Gauge
} from 'lucide-react';

interface MenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  submenu?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    title: 'Data Entry',
    path: '/data-entry',
    icon: <Database className="w-5 h-5" />,
    submenu: [
      {
        title: 'Companies',
        path: '/data-entry/companies',
        icon: <Building2 className="w-4 h-4" />,
      },
      {
        title: 'Countries',
        path: '/data-entry/countries',
        icon: <Globe className="w-4 h-4" />,
      },
      {
        title: 'Cities',
        path: '/data-entry/cities',
        icon: <MapPin className="w-4 h-4" />,
      },
      {
        title: 'Districts',
        path: '/data-entry/districts',
        icon: <MapPin className="w-4 h-4" />,
      },
      {
        title: 'Line Types',
        path: '/data-entry/line-types',
        icon: <Cog className="w-4 h-4" />,
      },
      {
        title: 'Production Lines',
        path: '/data-entry/lines',
        icon: <Factory className="w-4 h-4" />,
      },
      {
        title: 'Machines',
        path: '/data-entry/machines',
        icon: <Box className="w-4 h-4" />,
      },
      {
        title: 'KPIs',
        path: '/data-entry/kpis',
        icon: <Gauge className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: <Settings className="w-5 h-5" />,
  },
];

export const Sidebar = () => {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Data Entry': true,
  });

  const toggleSubmenu = (title: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus[item.title];

    return (
      <div key={item.path}>
        <div className={`${depth > 0 ? 'pl-4' : ''}`}>
          {hasSubmenu ? (
            <button
              onClick={() => toggleSubmenu(item.title)}
              className={`w-full flex items-center px-6 py-3 text-secondary hover:bg-secondary hover:bg-opacity-50`}
            >
              {item.icon}
              <span className="ml-3 flex-1">{item.title}</span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 ${
                  isActive
                    ? 'text-theme-accent bg-theme-accent bg-opacity-10'
                    : 'text-secondary hover:bg-secondary hover:bg-opacity-50'
                }`
              }
            >
              {item.icon}
              <span className="ml-3">{item.title}</span>
            </NavLink>
          )}
        </div>
        {hasSubmenu && isExpanded && (
          <div className="border-l border-secondary border-opacity-20 ml-6">
            {item.submenu.map(subItem => renderMenuItem(subItem, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sidebar">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary">Energy Monitor</h1>
      </div>
      <nav className="mt-8">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>
    </div>
  );
};
