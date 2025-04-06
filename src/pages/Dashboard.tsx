import React, { useState } from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Leaf,
  CalendarClock,
  Factory,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Search,
  Gauge,
  Zap,
  TrendingUp,
  Clock,
  BarChart3,
  Percent
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FactoryStatus {
  id: string;
  name: string;
  status: 'running' | 'warning' | 'alarm';
  oee_score: number;
  energy_usage: number;
  efficiency: number;
  uptime: number;
}

type SortField = 'name' | 'status' | 'oee_score' | 'energy_usage';
type SortOrder = 'asc' | 'desc';

// Mock data for energy consumption over time
const energyData = [
  { time: '00:00', value: 350 },
  { time: '04:00', value: 420 },
  { time: '08:00', value: 520 },
  { time: '12:00', value: 480 },
  { time: '16:00', value: 450 },
  { time: '20:00', value: 380 },
  { time: '23:59', value: 340 },
];

// Static factory data
const mockFactories: FactoryStatus[] = [
  {
    id: '1',
    name: 'Factory Alpha',
    status: 'running',
    oee_score: 92,
    energy_usage: 450,
    efficiency: 95,
    uptime: 99.8
  },
  {
    id: '2',
    name: 'Factory Beta',
    status: 'warning',
    oee_score: 78,
    energy_usage: 380,
    efficiency: 82,
    uptime: 95.5
  },
  {
    id: '3',
    name: 'Factory Gamma',
    status: 'alarm',
    oee_score: 65,
    energy_usage: 520,
    efficiency: 71,
    uptime: 88.2
  },
  {
    id: '4',
    name: 'Factory Delta',
    status: 'running',
    oee_score: 88,
    energy_usage: 410,
    efficiency: 91,
    uptime: 98.4
  },
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedFactories = [...mockFactories].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  const filteredFactories = sortedFactories.filter(factory => {
    const matchesSearch = factory.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || factory.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-6 h-6 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      case 'alarm':
        return <XCircle className="w-6 h-6 text-danger" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'alarm':
        return 'text-danger';
      default:
        return '';
    }
  };

  const getTotalMetrics = () => {
    return mockFactories.reduce((acc, curr) => ({
      energy: acc.energy + curr.energy_usage,
      oee: acc.oee + curr.oee_score,
      efficiency: acc.efficiency + curr.efficiency,
      uptime: acc.uptime + curr.uptime
    }), { energy: 0, oee: 0, efficiency: 0, uptime: 0 });
  };

  const totals = getTotalMetrics();
  const avgOEE = (totals.oee / mockFactories.length).toFixed(1);
  const avgEfficiency = (totals.efficiency / mockFactories.length).toFixed(1);
  const avgUptime = (totals.uptime / mockFactories.length).toFixed(1);

  const summaryCards = [
    {
      title: 'Total Energy',
      value: `${totals.energy.toFixed(1)} kWh`,
      change: '+5.2%',
      trend: 'up',
      icon: <Zap className="w-8 h-8 text-blue-500" />,
      color: 'bg-blue-500'
    },
    {
      title: 'Average OEE',
      value: `${avgOEE}%`,
      change: '-2.1%',
      trend: 'down',
      icon: <Gauge className="w-8 h-8 text-green-500" />,
      color: 'bg-green-500'
    },
    {
      title: 'Efficiency',
      value: `${avgEfficiency}%`,
      change: '+1.8%',
      trend: 'up',
      icon: <TrendingUp className="w-8 h-8 text-purple-500" />,
      color: 'bg-purple-500'
    },
    {
      title: 'Uptime',
      value: `${avgUptime}%`,
      change: '+0.5%',
      trend: 'up',
      icon: <Clock className="w-8 h-8 text-orange-500" />,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => (
          <div key={card.title} className="card p-6 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                {card.icon}
              </div>
              <span className={`text-sm font-medium ${
                card.trend === 'up' ? 'text-success' : 'text-danger'
              }`}>
                {card.change}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-secondary mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Energy Consumption Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-primary">Energy Consumption</h2>
            <p className="text-secondary text-sm">Last 24 hours</p>
          </div>
          <div className="flex items-center gap-4">
            <select 
              className="input bg-card"
              defaultValue="24h"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={energyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border opacity-20" />
              <XAxis 
                dataKey="time" 
                stroke="currentColor" 
                className="text-secondary text-sm"
              />
              <YAxis 
                stroke="currentColor" 
                className="text-secondary text-sm"
                unit=" kWh"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(var(--color-card))',
                  border: '1px solid rgb(var(--color-border))',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{
                  color: 'rgb(var(--color-primary))',
                }}
                itemStyle={{
                  color: 'rgb(var(--color-secondary))',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="rgb(var(--color-primary))" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Factory Status Table */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-primary">Factory Status Overview</h2>
            <p className="text-secondary text-sm">Real-time monitoring of all facilities</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
              <input
                type="text"
                placeholder="Search factories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input bg-card w-full md:w-auto"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="warning">Warning</option>
              <option value="alarm">Alarm</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 text-secondary font-semibold hover:text-primary"
                  >
                    Factory
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 text-secondary font-semibold hover:text-primary"
                  >
                    Status
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('oee_score')}
                    className="flex items-center gap-2 text-secondary font-semibold hover:text-primary"
                  >
                    OEE Score
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">Efficiency</th>
                <th className="text-left py-3 px-4">Uptime</th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('energy_usage')}
                    className="flex items-center gap-2 text-secondary font-semibold hover:text-primary"
                  >
                    Energy Usage
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFactories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-secondary">
                    No factories found
                  </td>
                </tr>
              ) : (
                filteredFactories.map((factory) => (
                  <tr key={factory.id} className="border-b border-border border-opacity-50 hover:bg-secondary hover:bg-opacity-5">
                    <td className="py-3 px-4 font-medium">{factory.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(factory.status)}
                        <span className={`capitalize font-medium ${getStatusColor(factory.status)}`}>
                          {factory.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-primary" />
                        <span className="font-medium">{factory.oee_score}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">{factory.efficiency}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">{factory.uptime}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{factory.energy_usage} kWh</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => navigate('/data-entry/lines')}
          className="card p-6 hover:bg-secondary hover:bg-opacity-5 text-left"
        >
          <div className="bg-blue-500 bg-opacity-10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Factory className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Production Lines</h3>
          <p className="text-secondary text-sm">
            Manage and monitor production line status
          </p>
        </button>

        <button
          onClick={() => navigate('/data-entry/machines')}
          className="card p-6 hover:bg-secondary hover:bg-opacity-5 text-left"
        >
          <div className="bg-purple-500 bg-opacity-10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Machine Analytics</h3>
          <p className="text-secondary text-sm">
            View detailed machine performance metrics
          </p>
        </button>

        <button
          onClick={() => navigate('/data-entry/kpis')}
          className="card p-6 hover:bg-secondary hover:bg-opacity-5 text-left"
        >
          <div className="bg-green-500 bg-opacity-10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Activity className="w-6 h-6 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">KPI Management</h3>
          <p className="text-secondary text-sm">
            Track and update key performance indicators
          </p>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="card p-6 hover:bg-secondary hover:bg-opacity-5 text-left"
        >
          <div className="bg-orange-500 bg-opacity-10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Leaf className="w-6 h-6 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sustainability</h3>
          <p className="text-secondary text-sm">
            Monitor environmental impact metrics
          </p>
        </button>
      </div>
    </div>
  );
};
