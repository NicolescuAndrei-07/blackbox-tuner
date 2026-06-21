import { useState } from "react";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResults, setAnalysisResults] = useState([]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const analyzeOvershoot = (header, dataRows) => {
    const axisLabels = ["Roll", "Pitch", "Yaw"];
    const results = [];

    for (let axis = 0; axis < 3; axis++) {
      const gyroIndex = header.findIndex(
        (name) =>
          name.endsWith(`gyroADC[${axis}]`) ||
          name.endsWith(`gyroData[${axis}]`)
      );

      const setpointIndex = header.findIndex(
        (name) =>
          name.endsWith(`setpoint[${axis}]`) ||
          name.endsWith(`rcCommand[${axis}]`)
      );

      if (gyroIndex === -1 || setpointIndex === -1) continue;

      const gyroValues = dataRows.map((row) => row[gyroIndex]);
      const setpointValues = dataRows.map((row) => row[setpointIndex]);

      const maxAbsSetpoint = Math.max(
        ...setpointValues.map((v) => Math.abs(v))
      );

      if (maxAbsSetpoint < 5) {
        results.push({
          axisIndex: axis,
          axisLabel: axisLabels[axis],
          totalCrossings: 0,
          overshootEvents: 0,
          overshootRatio: 0,
          detected: false,
        });
        continue;
      }

      const segments = [];
      let start = 0;

      for (let i = 1; i < setpointValues.length; i++) {
        if (setpointValues[i] !== setpointValues[i - 1]) {
          segments.push([start, i]);
          start = i;
        }
      }
      segments.push([start, setpointValues.length]);

      let totalCrossings = 0;
      let overshootEvents = 0;

      for (const [segStart, segEnd] of segments) {
        const segLen = segEnd - segStart;
        const constantSetpoint = setpointValues[segStart];

        if (
          Math.abs(constantSetpoint) < maxAbsSetpoint * 0.15 ||
          segLen < 5
        ) {
          continue;
        }

        let prevError = null;

        for (let i = segStart; i < segEnd; i++) {
          const error = gyroValues[i] - setpointValues[i];

          if (i === segStart) {
            prevError = error;
            continue;
          }

          if (Math.sign(prevError) !== Math.sign(error)) {
            totalCrossings++;

            const end = Math.min(i + 50, segEnd - 1);

            let maxErr = 0;
            for (let j = i; j <= end; j++) {
              const e = gyroValues[j] - setpointValues[j];
              maxErr = Math.max(maxErr, Math.abs(e));
            }

            if (maxErr > maxAbsSetpoint * 0.2) {
              overshootEvents++;
            }
          }

          prevError = error;
        }
      }

      const overshootRatio =
        totalCrossings > 0 ? overshootEvents / totalCrossings : 0;

      results.push({
        axisIndex: axis,
        axisLabel: axisLabels[axis],
        totalCrossings,
        overshootEvents,
        overshootRatio,
        detected: overshootRatio > 0.25,
      });
    }

    return results;
  };

  const handleAnalyze = () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;

      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      let headerIndex = -1;
      let header = [];

      for (let i = 0; i < lines.length - 1; i++) {
        const cols = lines[i]
          .split(",")
          .map((v) => v.replace(/"/g, "").trim());

        const norm = cols.map((v) => v.toLowerCase());

        if (!(norm.includes("time") || norm.includes("loopiteration"))) continue;

        const next = lines[i + 1]
          .split(",")
          .map((v) => v.replace(/"/g, "").trim());

        const numericCount = next.filter((v) => !isNaN(parseFloat(v))).length;

        if (numericCount > next.length / 2) {
          headerIndex = i;
          header = cols;
          break;
        }
      }

      if (headerIndex === -1) {
        console.error("Unknown CSV format");
        return;
      }

      const dataRows = lines.slice(headerIndex + 1).map((line) =>
        line.split(",").map((v) => parseFloat(v.replace(/"/g, "").trim()))
      );

      const results = analyzeOvershoot(header, dataRows);
      setAnalysisResults(results);

      console.log(results);
    };

    reader.readAsText(selectedFile);
  };

  const formatPercent = (r) => `${Math.round(r * 100)}%`;

  const getStatusClass = (r) => {
    if (r.totalCrossings < 3) return "status-insufficient";
    if (r.detected) return "status-warning";
    return "status-success";
  };

  return (
    <div className="app">
      <h1>Blackbox FPV Tuner Assistant</h1>

      <p>
        Upload a Blackbox Log file (.csv) to receive tuning advice
      </p>

      <input type="file" accept=".csv" onChange={handleFileChange} />

      <button onClick={handleAnalyze}>Analyze Log</button>

      {selectedFile && <p>Selected file: {selectedFile.name}</p>}

      <div id="results">
        {analysisResults.length === 0
          ? "Analysis results will appear here."
          : analysisResults.map((r) => (
              <div
                key={r.axisIndex}
                className={`result-card ${getStatusClass(r)}`}
              >
                <h3>{r.axisLabel}</h3>

                {r.totalCrossings < 3 ? (
                  <p>
                    Insufficient data on {r.axisLabel} axis (only {r.totalCrossings} maneuvers detected).
                  </p>
                ) : r.detected ? (
                  <p>
                    Overshoot detected on {r.axisLabel}: {formatPercent(r.overshootRatio)}
                  </p>
                ) : (
                  <p>
                    P-tuning looks OK on {r.axisLabel}: {formatPercent(r.overshootRatio)}
                  </p>
                )}

                <div className="details">
                  Details: {r.totalCrossings} crossings, {r.overshootEvents} overshoot events
                </div>
              </div>
            ))}
      </div>

      <footer>
        <p className="footer-text">Was this tool useful to you?</p>
        <a
          href="https://ko-fi.com/andreico"
          target="_blank"
          rel="noopener noreferrer"
          className="kofi-button"
        >
          ☕ Support the project on Ko-fi
        </a>
      </footer>
    </div>
  );
}

export default App;