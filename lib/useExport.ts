import { useCallback } from 'react'
import { useTelemetryStore } from '@/lib/useTelemetryStore'
import { CONDITIONS } from '@/lib/conditions'

export function useExport(canvasContainerRef: React.RefObject<HTMLDivElement | null>) {
  const takeScreenshot = useCallback(() => {
    if (!canvasContainerRef.current) return
    const canvas = canvasContainerRef.current.querySelector('canvas')
    if (!canvas) return

    try {
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `SPHERE_twin_${Date.now()}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Screenshot failed:', err)
    }
  }, [canvasContainerRef])

  const generateReport = useCallback(() => {
    const state = useTelemetryStore.getState()
    const frame = state.liveTelemetryFrame
    const condition = state.currentCondition || 'diabetes'
    const condData = CONDITIONS[condition as keyof typeof CONDITIONS]
    const now = new Date().toLocaleString()

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>S.P.H.E.R.E. Telemetry Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; background: #0a0e0c; color: #e0e0e0; padding: 40px; }
  .header { text-align: center; border-bottom: 1px solid #00ffaa40; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 24px; color: #00ffaa; letter-spacing: 8px; margin-bottom: 4px; }
  .header p { font-size: 10px; color: #666; letter-spacing: 4px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 11px; color: #00ccff; letter-spacing: 3px; margin-bottom: 12px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ffffff08; font-size: 12px; }
  th { color: #666; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; }
  .value { color: #00ffaa; font-weight: bold; font-size: 14px; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9px; letter-spacing: 2px; }
  .status-nominal { background: #00ffaa20; color: #00ffaa; border: 1px solid #00ffaa40; }
  .status-warning { background: #f59e0b20; color: #f59e0b; border: 1px solid #f59e0b40; }
  .status-crisis { background: #ef444420; color: #ef4444; border: 1px solid #ef444440; }
  .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #444; border-top: 1px solid #ffffff08; padding-top: 16px; }
  @media print { body { background: white; color: #333; } .value { color: #0a8a5e; } }
</style></head><body>
<div class="header">
  <h1>S.P.H.E.R.E.</h1>
  <p>SYNCHRONIZED PHYSIOLOGICAL HOLOGRAPHIC ENGINE FOR REAL-TIME EVALUATION</p>
</div>

<div class="section">
  <h2>Patient Profile</h2>
  <table>
    <tr><th>Name</th><td>CDR. ALEX MERCER</td></tr>
    <tr><th>Active Condition</th><td>${condData?.label || condition}</td></tr>
    <tr><th>Status</th><td><span class="status status-${frame.isCrisisActive ? 'crisis' : 'nominal'}">${frame.isCrisisActive ? 'CRISIS' : 'NOMINAL'}</span></td></tr>
    <tr><th>Report Time</th><td>${now}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Vital Signs</h2>
  <table>
    <tr><th>Metric</th><th>Value</th><th>Unit</th><th>Range</th></tr>
    <tr><td>Heart Rate</td><td class="value">${Math.round(frame.bpm)}</td><td>BPM</td><td>60-100</td></tr>
    <tr><td>Oxygen Saturation</td><td class="value">${frame.oxygenSaturation?.toFixed(1)}</td><td>%</td><td>95-100</td></tr>
    <tr><td>Blood Glucose</td><td class="value">${Math.round(frame.glucose || 0)}</td><td>mg/dL</td><td>70-140</td></tr>
    <tr><td>Brainwave Frequency</td><td class="value">${(frame.brainwaveFrequency || 0).toFixed(1)}</td><td>Hz</td><td>8-13</td></tr>
    <tr><td>Systolic BP</td><td class="value">${Math.round((frame as any).systolicBP || 120)}</td><td>mmHg</td><td>90-140</td></tr>
    <tr><td>Diastolic BP</td><td class="value">${Math.round((frame as any).diastolicBP || 80)}</td><td>mmHg</td><td>60-90</td></tr>
    <tr><td>Core Temperature</td><td class="value">${((frame as any).coreTemp || 37.0).toFixed(1)}</td><td>°C</td><td>36.1-37.2</td></tr>
  </table>
</div>

<div class="footer">
  S.P.H.E.R.E. TELEMETRY SYSTEM — GENERATED ${now}<br/>
  Classification: CONFIDENTIAL — MEDICAL USE ONLY
</div>
</body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }
  }, [])

  return { takeScreenshot, generateReport }
}
