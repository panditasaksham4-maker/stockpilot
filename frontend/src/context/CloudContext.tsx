import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  ClusterMetrics, 
  InstanceMetric, 
  AnomalyResult, 
  IncidentRecord, 
  SystemSettings, 
  TopologyData,
  RiskLevel
} from '../types';
import { api } from '../services/api';
import { localSimulator } from '../services/localSimulator';

interface CloudContextType {
  cluster: ClusterMetrics;
  instances: InstanceMetric[];
  aiInsight: AnomalyResult | null;
  activeIncident: IncidentRecord | null;
  history: any[];
  incidents: IncidentRecord[];
  settings: SystemSettings;
  isBackendConnected: boolean;
  activeFault: string | null;
  injectFault: (scenario: string) => Promise<void>;
  approveRemediation: (incidentId: string) => Promise<void>;
  rejectRemediation: (incidentId: string) => Promise<void>;
  toggleEmergencyStop: () => Promise<void>;
  updateSettings: (newSettings: SystemSettings) => Promise<void>;
  refreshIncidents: () => Promise<void>;
}

const defaultCluster: ClusterMetrics = {
  timestamp: new Date().toLocaleTimeString(),
  cpu_utilization: 42.5,
  memory_utilization: 51.0,
  network_traffic_mbps: 38.0,
  request_latency_ms: 31.5,
  error_rate: 0.04,
  healthy_containers: 3,
  total_containers: 3,
  active_incidents_count: 0,
  health_score: 98.5,
  is_simulated: true,
  active_fault: null
};

const defaultSettings: SystemSettings = {
  auto_healing_enabled: true,
  manual_approval_mode: false,
  emergency_stop: false,
  min_replicas: 3,
  max_replicas: 8,
  cpu_warning_threshold: 75.0,
  cpu_critical_threshold: 90.0,
  memory_warning_threshold: 75.0,
  memory_critical_threshold: 85.0,
  latency_threshold_ms: 200.0,
  error_rate_threshold_pct: 5.0,
  remediation_cooldown_sec: 12,
  max_retry_attempts: 3,
  verification_window_sec: 8,
  anomaly_sensitivity: 0.65
};

const CloudContext = createContext<CloudContextType | undefined>(undefined);

export const CloudProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cluster, setCluster] = useState<ClusterMetrics>(defaultCluster);
  const [instances, setInstances] = useState<InstanceMetric[]>([]);
  const [aiInsight, setAiInsight] = useState<AnomalyResult | null>(null);
  const [activeIncident, setActiveIncident] = useState<IncidentRecord | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [activeFault, setActiveFault] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Fallback local ticker if backend is unavailable
  useEffect(() => {
    let localInterval: any = null;
    if (!isBackendConnected) {
      localInterval = setInterval(() => {
        const simData = localSimulator.step();
        setCluster(simData.cluster);
        setInstances(simData.instances);
        setAiInsight(simData.anomaly);
        setActiveIncident(simData.activeIncident);
        setActiveFault(simData.cluster.active_fault || null);

        setHistory(prev => {
          const pt = {
            timestamp: simData.cluster.timestamp,
            cpu: simData.cluster.cpu_utilization,
            memory: simData.cluster.memory_utilization,
            latency: simData.cluster.request_latency_ms,
            network: simData.cluster.network_traffic_mbps,
            error_rate: simData.cluster.error_rate,
            health_score: simData.cluster.health_score
          };
          const next = [...prev, pt];
          return next.slice(-40);
        });

        setIncidents([...localSimulator.incidents]);
      }, 1000);
    }

    return () => {
      if (localInterval) clearInterval(localInterval);
    };
  }, [isBackendConnected]);

  // Connect to backend WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname || 'localhost'}:8000/ws/telemetry`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[CloudControl] WebSocket connected to FastAPI backend.');
        setIsBackendConnected(true);
        // Refresh incidents from SQLite
        api.getIncidents({ limit: 50 }).then(res => setIncidents(res.incidents)).catch(() => {});
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.cluster) {
            setCluster(data.cluster);
            setActiveFault(data.cluster.active_fault || null);
          }
          if (data.instances) setInstances(data.instances);
          if (data.ai_insight) setAiInsight(data.ai_insight);
          if (data.active_incident !== undefined) setActiveIncident(data.active_incident);
          if (data.history) setHistory(data.history);
          if (data.settings) setSettings(data.settings);
        } catch (e) {
          console.error('Error parsing WS telemetry packet', e);
        }
      };

      ws.onclose = () => {
        console.warn('[CloudControl] WebSocket disconnected. Reconnecting in 3s...');
        setIsBackendConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setIsBackendConnected(false);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    }
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket]);

  const refreshIncidents = useCallback(async () => {
    if (isBackendConnected) {
      try {
        const res = await api.getIncidents({ limit: 50 });
        setIncidents(res.incidents);
      } catch (e) {
        console.error(e);
      }
    } else {
      setIncidents([...localSimulator.incidents]);
    }
  }, [isBackendConnected]);

  const injectFault = useCallback(async (scenario: string) => {
    setActiveFault(scenario === 'reset' ? null : scenario);
    if (isBackendConnected) {
      await api.injectFault(scenario);
    } else {
      localSimulator.injectFault(scenario);
    }
  }, [isBackendConnected]);

  const approveRemediation = useCallback(async (incidentId: string) => {
    if (isBackendConnected) {
      await api.approveRemediation(incidentId);
      await refreshIncidents();
    } else {
      localSimulator.approveActiveIncident();
    }
  }, [isBackendConnected, refreshIncidents]);

  const rejectRemediation = useCallback(async (incidentId: string) => {
    if (isBackendConnected) {
      await api.rejectRemediation(incidentId);
      await refreshIncidents();
    } else {
      localSimulator.rejectActiveIncident();
    }
  }, [isBackendConnected, refreshIncidents]);

  const toggleEmergencyStop = useCallback(async () => {
    const nextStop = !settings.emergency_stop;
    if (isBackendConnected) {
      if (nextStop) await api.emergencyStop();
      else await api.resumeHealing();
      const updated = await api.getSettings();
      setSettings(updated);
    } else {
      localSimulator.settings.emergency_stop = nextStop;
      setSettings({ ...localSimulator.settings });
    }
  }, [isBackendConnected, settings.emergency_stop]);

  const updateSettingsHandler = useCallback(async (newSettings: SystemSettings) => {
    if (isBackendConnected) {
      const res = await api.updateSettings(newSettings);
      setSettings(res.settings);
    } else {
      localSimulator.settings = newSettings;
      setSettings({ ...newSettings });
    }
  }, [isBackendConnected]);

  return (
    <CloudContext.Provider value={{
      cluster,
      instances,
      aiInsight,
      activeIncident,
      history,
      incidents,
      settings,
      isBackendConnected,
      activeFault,
      injectFault,
      approveRemediation,
      rejectRemediation,
      toggleEmergencyStop,
      updateSettings: updateSettingsHandler,
      refreshIncidents
    }}>
      {children}
    </CloudContext.Provider>
  );
};

export const useCloud = () => {
  const context = useContext(CloudContext);
  if (!context) throw new Error('useCloud must be used within CloudProvider');
  return context;
};
