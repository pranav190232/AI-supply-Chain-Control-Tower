import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { Shipment } from "./src/types";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const logFile = path.join(process.cwd(), "server_startup.log");
  const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    const formatted = `${timestamp} - ${msg}\n`;
    console.log(msg);
    try {
      fs.appendFileSync(logFile, formatted);
    } catch (e) {
      console.error("Failed to write to log file:", e);
    }
  };

  try {
    log("Server starting...");
    const app = express();
    const PORT = 3000;

    app.use(express.json());

    // Logging middleware
    app.use((req, res, next) => {
      log(`${req.method} ${req.url}`);
      next();
    });

    // Mock Data Store
    let shipments: Shipment[] = [
      {
        id: "SH-001",
        containerId: "CONT-Z9301",
        carrier: "Maersk Line",
        vessel: "Maersk Edmonton",
        cargoType: "Electronics",
        origin: "Shanghai, CN",
        destination: "Los Angeles, US",
        currentLocation: { lat: 31.2304, lng: 121.4737 },
        eta: "2026-04-26T12:00:00Z",
        timeToReach: "3 days 4 hrs",
        status: "In Transit",
        route: [
          { lat: 31.2304, lng: 121.4737 },
          { lat: 33.00, lng: -160.00 },
          { lat: 34.0522, lng: -118.2437 },
        ],
        progress: 0.3,
        history: [
          { time: "2026-04-22T08:00:00Z", event: "Gate-in at Shanghai Terminal" },
          { time: "2026-04-23T10:00:00Z", event: "Vessel Departure" }
        ]
      },
      {
        id: "SH-002",
        containerId: "CONT-B4412",
        carrier: "MSC",
        vessel: "MSC Oscar",
        cargoType: "Automotive Parts",
        origin: "Hamburg, DE",
        destination: "New York, US",
        currentLocation: { lat: 53.5511, lng: 9.9937 },
        eta: "2026-04-25T08:00:00Z",
        timeToReach: "2 days 15 hrs (Delayed)",
        status: "Delayed",
        risk: 0.92,
        disruption: { 
          type: "Transit_Hub ORD", 
          description: "Sorting delay reported in secondary terminal.",
          severity: "warning" 
        },
        route: [
          { lat: 53.5511, lng: 9.9937 },
          { lat: 48.00, lng: -35.00 },
          { lat: 40.7128, lng: -74.0060 },
        ],
        progress: 0.45,
        history: [
          { time: "2026-04-20T14:00:00Z", event: "Vessel Arrived at Port of Hamburg" },
          { time: "2026-04-21T09:00:00Z", event: "Berthing Delay: Terminal Congestion" },
          { time: "2026-04-22T12:00:00Z", event: "Vessel Departure Hamburg" }
        ]
      },
      {
        id: "SH-003",
        containerId: "CONT-Y5522",
        carrier: "CMA CGM",
        vessel: "CMA CGM Antoine",
        cargoType: "Pharmaceuticals",
        origin: "Singapore, SG",
        destination: "Rotterdam, NL",
        currentLocation: { lat: 1.3521, lng: 103.8198 },
        eta: "2026-05-01T18:00:00Z",
        timeToReach: "8 days 14 hrs",
        status: "At Risk",
        risk: 0.81,
        disruption: { 
          type: "Weather Case_4", 
          description: "High-altitude storm cell impacting North Pacific route.",
          severity: "critical" 
        },
        route: [
          { lat: 1.3521, lng: 103.8198 },
          { lat: 15.00, lng: 60.00 },
          { lat: 51.9225, lng: 4.4792 },
        ],
        progress: 0.15,
        history: [
          { time: "2026-04-23T06:00:00Z", event: "Departure Singapore Terminal" }
        ]
      },
      {
        id: "SH-004",
        containerId: "CONT-K8890",
        carrier: "Evergreen",
        vessel: "Ever Given",
        cargoType: "Consumer Goods",
        origin: "Tokyo, JP",
        destination: "San Francisco, US",
        currentLocation: { lat: 35.6762, lng: 139.6503 },
        eta: "2026-04-29T10:00:00Z",
        timeToReach: "5 days 2 hrs",
        status: "In Transit",
        route: [
          { lat: 35.6762, lng: 139.6503 },
          { lat: 40.00, lng: 170.00 },
          { lat: 37.7749, lng: -122.4194 }
        ],
        progress: 0.6,
        history: [
          { time: "2026-04-20T08:00:00Z", event: "Gate-in at Tokyo Bay" },
          { time: "2026-04-21T09:00:00Z", event: "Vessel Departure" }
        ]
      },
      {
        id: "SH-005",
        containerId: "CONT-Q1140",
        carrier: "Hapag-Lloyd",
        vessel: "Colombo Express",
        cargoType: "Machinery",
        origin: "Mumbai, IN",
        destination: "Dubai, AE",
        currentLocation: { lat: 25.2048, lng: 55.2708 },
        eta: "2026-04-24T08:00:00Z",
        timeToReach: "Arrived",
        status: "Arrived",
        route: [
          { lat: 18.9667, lng: 72.8333 },
          { lat: 22.00, lng: 65.00 },
          { lat: 25.2048, lng: 55.2708 }
        ],
        progress: 1.0,
        history: [
          { time: "2026-04-18T05:00:00Z", event: "Departure Mumbai" },
          { time: "2026-04-24T07:15:00Z", event: "Docked at Jebel Ali" }
        ]
      },
      {
        id: "SH-006",
        containerId: "CONT-P9988",
        carrier: "ONE",
        vessel: "ONE Apus",
        cargoType: "Agricultural",
        origin: "Cape Town, ZA",
        destination: "London, UK",
        currentLocation: { lat: -33.9249, lng: 18.4241 },
        eta: "2026-05-10T14:00:00Z",
        timeToReach: "16 days (Delayed)",
        status: "Delayed",
        risk: 0.98,
        disruption: { 
          type: "Port Strike_LHR", 
          description: "Industrial action at destination terminal.",
          severity: "warning" 
        },
        route: [
          { lat: -33.9249, lng: 18.4241 },
          { lat: 0.00, lng: -10.00 },
          { lat: 51.5074, lng: -0.1278 }
        ],
        progress: 0.1,
        history: [
          { time: "2026-04-24T01:00:00Z", event: "Departure Table Bay" }
        ]
      },
      {
        id: "SH-007",
        containerId: "CONT-M7721",
        carrier: "Yang Ming",
        vessel: "YM Witness",
        cargoType: "Textiles",
        origin: "Sydney, AU",
        destination: "Los Angeles, US",
        currentLocation: { lat: -33.8688, lng: 151.2093 },
        eta: "2026-05-08T22:00:00Z",
        timeToReach: "14 days 14 hrs",
        status: "In Transit",
        route: [
          { lat: -33.8688, lng: 151.2093 },
          { lat: -10.00, lng: 180.00 },
          { lat: 20.00, lng: -150.00 },
          { lat: 34.0522, lng: -118.2437 }
        ],
        progress: 0.2,
        history: [
          { time: "2026-04-23T18:00:00Z", event: "Sailing from Port Botany" }
        ]
      },
      {
        id: "SH-008",
        containerId: "CONT-F3320",
        carrier: "ZIM",
        vessel: "ZIM San Diego",
        cargoType: "Chemicals",
        origin: "Rio de Janeiro, BR",
        destination: "Miami, US",
        currentLocation: { lat: -22.9068, lng: -43.1729 },
        eta: "2026-05-02T16:00:00Z",
        timeToReach: "8 days 8 hrs",
        status: "At Risk",
        risk: 0.72,
        disruption: { 
          type: "Hurricane_Warn", 
          description: "Category 2 storm developing in Caribbean trajectory.",
          severity: "critical" 
        },
        route: [
          { lat: -22.9068, lng: -43.1729 },
          { lat: 10.00, lng: -60.00 },
          { lat: 25.7617, lng: -80.1918 }
        ],
        progress: 0.05,
        history: [
          { time: "2026-04-24T04:00:00Z", event: "Vessel Departure Rio" }
        ]
      },
      {
        id: "SH-009",
        containerId: "CONT-D4411",
        carrier: "Cosco",
        vessel: "Cosco Glory",
        cargoType: "Raw Materials",
        origin: "Hong Kong, HK",
        destination: "Vancouver, CA",
        currentLocation: { lat: 22.3193, lng: 114.1694 },
        eta: "2026-05-05T09:00:00Z",
        timeToReach: "11 days 1 hrs",
        status: "In Transit",
        route: [
          { lat: 22.3193, lng: 114.1694 },
          { lat: 45.00, lng: 170.00 },
          { lat: 49.2827, lng: -123.1207 }
        ],
        progress: 0.25,
        history: [
          { time: "2026-04-22T10:00:00Z", event: "Gate-in at Victoria Harbour" },
          { time: "2026-04-23T11:30:00Z", event: "Departure" }
        ]
      }
    ];

    log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Simulation Config
    let simConfig = {
      speed: 1,
      isPaused: false
    };

    // API Routes
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString(), simConfig });
    });

    app.get("/api/simulation/config", (req, res) => {
      res.json(simConfig);
    });

    app.post("/api/simulation/config", (req, res) => {
      const { speed, isPaused } = req.body;
      if (typeof speed === "number") simConfig.speed = speed;
      if (typeof isPaused === "boolean") simConfig.isPaused = isPaused;
      log(`Simulation config updated: Speed=${simConfig.speed}x, Paused=${simConfig.isPaused}`);
      res.json(simConfig);
    });

    app.get("/api/shipments", (req, res) => {
      log(`API REQUEST: GET /api/shipments [Accept: ${req.headers.accept}]`);
      res.setHeader('Content-Type', 'application/json');
      res.json(shipments);
    });

    app.post("/api/predict-delay", (req, res) => {
      const { shipmentId } = req.body;
      const shipment = shipments.find(s => s.id === shipmentId);
      if (!shipment) return res.status(404).json({ error: "Shipment not found" });

      // Mock AI Logic tied to shipment risk profile
      if (shipment.status === "Rerouted") {
        return res.json({ shipmentId, probability: shipment.risk || 0.12, reason: "Route optimized. Risk minimized. Avoiding meteorological threat vector.", estimatedDelayHours: 0 });
      }

      const probability = shipment.risk || (shipment.status === "Delayed" ? 0.95 : 0.23);
      const estimatedDelayHours = probability > 0.7 ? Math.floor(Math.random() * 48) + 24 : 0;
      const reason = probability > 0.7 
        ? "Severe meteorological disruption detected in maritime corridor. High probability of container loss or port rejection." 
        : "Operational parameters within specified variance.";
      
      const isDetour = shipmentId === 'SH-003';
      const etaForecast = {
        min: estimatedDelayHours > 0 ? `+${Math.max(1, estimatedDelayHours - 12)} HRS` : '-2 HRS',
        max: estimatedDelayHours > 0 ? `+${estimatedDelayHours + 24} HRS` : '+4 HRS',
        expected: estimatedDelayHours > 0 ? `+${estimatedDelayHours} HRS` : 'ON TIME',
        factors: [
          { type: 'weather', impact: probability > 0.7 ? 'SEVERE' : 'LOW', description: 'Tropical / meteorological disturbance analysis' },
          { type: 'traffic', impact: 'MODERATE', description: 'Vessel density along maritime corridor' },
          { type: 'port_congestion', impact: isDetour ? 'HIGH' : 'LOW', description: 'Destination terminal queuing time' }
        ]
      };

      res.json({ shipmentId, probability, reason, estimatedDelayHours, etaForecast });
    });

    app.post("/api/optimize-route", (req, res) => {
      const { shipmentId, scenarioId } = req.body;
      const shipment = shipments.find(s => s.id === shipmentId);
      if (!shipment) return res.status(404).json({ error: "Shipment not found" });

      // If scenarioId is provided, look up the scenario details
      let impact = { 
        timeDelta: "-14.5 HRS", 
        efficiency: "+3.2% EFFICIENCY",
        description: "Recalculated route via secondary terminal bypass string. ETA accelerated."
      };

      if (scenarioId === 'sc-1') {
        impact = { timeDelta: "-18.5 HRS", efficiency: "+5.4%", description: "Aggressive Transit: Maximizing speed via favorable current vectors." };
      } else if (scenarioId === 'sc-2') {
        impact = { timeDelta: "+4.0 HRS", efficiency: "+12.1%", description: "Green Path: Minimal carbon footprint RPM throttling." };
      } else if (scenarioId === 'sc-3') {
        impact = { timeDelta: "+12.0 HRS", efficiency: "-2.4%", description: "Storm Bypass B: Trajectory avoiding convection zones." };
      } else if (shipmentId === 'SH-003') {
        impact = { timeDelta: "+22.5 HRS", efficiency: "-8.4% EFFICIENCY", description: "Recalculated deep-water route to bypass critical storm cell. ETA extended." };
      }

      // Mock Optimized Route (slightly different from original)
      const offset = scenarioId === 'sc-1' ? 7 : scenarioId === 'sc-2' ? 3 : 5;
      const optimizedRoute = [
        ...shipment.route.slice(0, 2),
        { lat: shipment.route[1].lat + offset, lng: shipment.route[1].lng - offset },
        shipment.route[2]
      ];
      
      res.json({ 
        shipmentId, 
        optimizedRoute, 
        impact
      });
    });

    app.post("/api/routing-scenarios", (req, res) => {
      const { shipmentId } = req.body;
      const shipment = shipments.find(s => s.id === shipmentId);
      if (!shipment) return res.status(404).json({ error: "Shipment not found" });

      const scenarios = [
        {
          id: 'sc-1',
          name: 'Aggressive Transit',
          description: 'Maximizes speed by leveraging favorable current vectors. Higher fuel burn.',
          timeDelta: '-18.5 HRS',
          efficiency: '+5.4%',
          riskLevel: 'Medium'
        },
        {
          id: 'sc-2',
          name: 'Green Path',
          description: 'Optimized for minimal carbon footprint using engine RPM throttling.',
          timeDelta: '+4.0 HRS',
          efficiency: '+12.1%',
          riskLevel: 'Low'
        },
        {
          id: 'sc-3',
          name: 'Storm Bypass B',
          description: 'Alternative northern trajectory avoiding the convection zone entirely.',
          timeDelta: '+12.0 HRS',
          efficiency: '-2.4%',
          riskLevel: 'Low'
        }
      ];

      res.json(scenarios);
    });

    app.post("/api/decision", (req, res) => {
      const { shipmentId, action, scenarioId } = req.body || {};
      if (!shipmentId) return res.status(400).json({ error: "shipmentId is required" });
      
      const shipment = shipments.find(s => s.id === shipmentId);
      if (shipment) {
        if (action === "reroute") {
          shipment.status = "Optimizing";
          
          const offset = scenarioId === 'sc-1' ? 7 : scenarioId === 'sc-2' ? 3 : 5;
          const optRoute = [
            ...shipment.route.slice(0, 2),
            { lat: shipment.route[1].lat + offset, lng: shipment.route[1].lng - offset },
            shipment.route[2]
          ];
          
          setTimeout(() => {
            shipment.status = "Rerouted";
            shipment.risk = scenarioId === 'sc-1' ? 0.45 : 0.01; // Aggressive has more risk
            shipment.newRoute = optRoute; // persist optimized route to be purple
            shipment.disruption = undefined; // Clear disruption after reroute
            
            // Recalculate ETA string dynamically depending on if it's a detour or a shortcut
            if (shipment.eta) {
              const currentEta = new Date(shipment.eta);
              let hoursToAdd = -14;
              let displayText = "2 DAYS 0 HRS (ACCELERATED)";

              if (scenarioId === 'sc-1') { hoursToAdd = -18; displayText = "1 DAY 18 HRS (AGGRESSIVE)"; }
              else if (scenarioId === 'sc-2') { hoursToAdd = 4; displayText = "3 DAYS 4 HRS (ECONOMY)"; }
              else if (scenarioId === 'sc-3') { hoursToAdd = 12; displayText = "3 DAYS 12 HRS (SAFE)"; }
              else if (shipment.id === 'SH-003') { hoursToAdd = 22; displayText = "9 DAYS 12 HRS (EXTENDED)"; }

              currentEta.setHours(currentEta.getHours() + hoursToAdd);
              shipment.eta = currentEta.toISOString();
              shipment.timeToReach = displayText;
            }
          }, 3000);
        }
      }
      res.json({ success: true, newStatus: shipment?.status });
    });

    app.get("/api/weather", (req, res) => {
      const { shipmentId } = req.query;
      const shipment = shipments.find(s => s.id === shipmentId);
      
      if (!shipment) {
        // Return global/random weather if no shipment
        return res.json([
          { lat: 40, lng: -40, condition: "Stormy", temperature: 18, windSpeed: 45, severity: "high" },
          { lat: 20, lng: 110, condition: "Typhoon", temperature: 28, windSpeed: 120, severity: "extreme" }
        ]);
      }

      const activeRoute = shipment.newRoute || shipment.route;
      // Generate weather points along the route
      const weatherPoints = activeRoute.map((point, idx) => {
        const hash = (shipment.id.length + idx + Math.floor(Date.now() / 100000)) % 4;
        const conditions = [
          { condition: "Clear", temp: 22, wind: 10, severity: "low" },
          { condition: "Foggy", temp: 15, wind: 5, severity: "moderate" },
          { condition: "Stormy", temp: 18, wind: 45, severity: "high" },
          { condition: "Heavy Sea", temp: 16, wind: 65, severity: "high" }
        ];
        
        // Special case for SH-003 (the one at risk)
        if (shipment.id === 'SH-003' && idx === 1 && shipment.status !== 'Rerouted') {
          return {
            ...point,
            condition: "Cyclone Alpha",
            temperature: 24,
            windSpeed: 140,
            severity: "extreme"
          };
        }

        return {
          lat: point.lat + (Math.random() - 0.5) * 2,
          lng: point.lng + (Math.random() - 0.5) * 2,
          ...conditions[hash]
        };
      });

      res.json(weatherPoints);
    });

    // API 404 Handler - MUST be after all API routes but before Vite/Static
    app.use("/api/*", (req, res) => {
      log(`API 404: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ 
        error: "Not Found", 
        path: req.originalUrl,
        message: "The requested API endpoint does not exist." 
      });
    });

    // Global Error Handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      log(`EXPRESS ERROR: ${err.stack || err}`);
      if (res.headersSent) return next(err);
      res.status(500).json({ error: "Internal Server Error", message: err.message });
    });

    // Start listening as soon as API is ready
    const server = app.listen(PORT, "0.0.0.0", () => {
      log(`Server listening on http://localhost:${PORT}`);
    });

    // Simulation: Move shipments slightly
    setInterval(() => {
      if (simConfig.isPaused) return;

      try {
        shipments = shipments.map(s => {
          if (s.status === "In Transit" || s.status === "Rerouted") {
            const increment = 0.001 * simConfig.speed;
            const nextProgress = Math.min(1, s.progress + increment);
            return { ...s, progress: nextProgress };
          }
          return s;
        });
      } catch (err) {
        log(`SIMULATION ERROR: ${err}`);
      }
    }, 1000);

    // Vite/Static handling
    if (process.env.NODE_ENV !== "production") {
      log("Initializing Vite...");
      try {
        const vite = await createViteServer({
          root: process.cwd(),
          server: { 
            middlewareMode: true,
            hmr: false 
          },
          appType: "spa",
        });
        app.use(vite.middlewares);
        log("Vite middleware active.");
      } catch (viteErr) {
        log("Vite initialization FAILED: " + viteErr);
      }
    } else {
      log("Production mode: Serving static files.");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

  } catch (err) {
    fs.appendFileSync(path.join(process.cwd(), "server_startup.log"), `CRITICAL ERROR: ${err}\n`);
    process.exit(1);
  }
}

startServer();
