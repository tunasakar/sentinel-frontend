import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Globe, Building, MapPin, Factory, Cog, Cpu, Gauge } from 'lucide-react';

export function DataEntry() {
  const menuItems = [
    { icon: Building2, label: 'Companies', path: '/data-entry/companies' },
    { icon: Globe, label: 'Countries', path: '/data-entry/countries' },
    { icon: Building, label: 'Cities', path: '/data-entry/cities' },
    { icon: MapPin, label: 'Districts', path: '/data-entry/districts' },
    { icon: Factory, label: 'Line Types', path: '/data-entry/line-types' },
    { icon: Cog, label: 'Lines', path: '/data-entry/lines' },
    { icon: Cpu, label: 'Machines', path: '/data-entry/machines' },
    { icon: Gauge, label: 'KPIs', path: '/data-entry/kpis' },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Data Entry</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center p-4 bg-card hover:bg-accent rounded-lg transition-colors"
            >
              <Icon className="w-6 h-6 mr-3" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
