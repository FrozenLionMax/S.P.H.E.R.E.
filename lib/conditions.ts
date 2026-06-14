// Medical condition definitions for the Digital Twin diagnostic system

export type ConditionKey = 'diabetes' | 'arrhythmia' | 'asthma' | 'epilepsy';

export interface ConditionInfo {
  name: string;
  label: string;
  status: 'NOMINAL' | 'WARNING' | 'CRISIS';
  color: string;
  hexColor: string;
  bpm: number;
  spo2: number;
  resp: number;
  glucose: number;
  stress: number;
  desc: string;
  description: string;
  riskFactors: string[];
  treatment: string[];
  logs: string[];
}

export const CONDITIONS: Record<ConditionKey, ConditionInfo> = {
  diabetes: {
    name: 'Diabetic Glucose Spike',
    label: 'Type 2 Diabetes — Glucose Crisis',
    status: 'CRISIS',
    color: 'text-amber-500 border-amber-500/30',
    hexColor: '#ff9900',
    bpm: 88,
    spo2: 92,
    resp: 16,
    glucose: 260,
    stress: 68,
    desc: 'Systemic metabolic crisis detected. Elevated plasma glucose levels exceeding 260 mg/dL. Osmotic shift modeling active.',
    description: 'Hyperglycemic episode with plasma glucose exceeding 260 mg/dL. Osmotic shift affecting renal and hepatic function.',
    riskFactors: ['Hepatic gluconeogenesis overload', 'Renal filtration stress', 'Peripheral neuropathy cascade', 'Osmotic diuresis risk'],
    treatment: ['Administer rapid-acting insulin', 'IV saline hydration protocol', 'Continuous glucose monitoring', 'Electrolyte panel assessment'],
    logs: [
      'Telemetry stream integrity 99.6%',
      'Scanner: Re-evaluating... Diabetic Glucose Spike parameters...',
      'System Integrity: 99.8%',
      'Diagnostics: Osmotic shift modeling active',
      'Status: Systemic metabolic crisis detected'
    ]
  },
  arrhythmia: {
    name: 'Cardiovascular Arrhythmia',
    label: 'Ventricular Arrhythmia — Cardiac Emergency',
    status: 'CRISIS',
    color: 'text-red-500 border-red-500/30',
    hexColor: '#ff2b56',
    bpm: 138,
    spo2: 95,
    resp: 18,
    glucose: 280,
    stress: 76,
    desc: 'Critical cardiac instability detected. Ectopic pacemaking in ventricles observed. Visualizing erratic PQRST complex.',
    description: 'Ectopic pacemaking in ventricles with erratic PQRST complex. Cardiac output compromised at 138 BPM.',
    riskFactors: ['Ventricular fibrillation risk', 'Hemodynamic instability', 'Coronary perfusion deficit', 'Syncope probability elevated'],
    treatment: ['12-lead ECG continuous monitoring', 'Amiodarone IV preparation', 'Defibrillator on standby', 'Vagal maneuver assessment'],
    logs: [
      'Telemetry stream integrity 99.6%',
      'Scanner: Re-evaluating... Cardiovascular Arrhythmia parameters...',
      'System Integrity: 99.8%',
      'Diagnostics: High ventricular load observed',
      'Status: Critical cardiac instability detected'
    ]
  },
  asthma: {
    name: 'Chronic Asthma',
    label: 'Acute Asthma — Respiratory Distress',
    status: 'WARNING',
    color: 'text-cyan-400 border-cyan-500/30',
    hexColor: '#00ccff',
    bpm: 84,
    spo2: 89,
    resp: 9,
    glucose: 280,
    stress: 54,
    desc: 'Compromised pulmonary ventilation. SpO2 critical threshold breached (<90%). Rhythmic respiration amplitude restriction.',
    description: 'Bronchial constriction causing SpO2 drop below 90%. Ventilation-perfusion mismatch detected across both lobes.',
    riskFactors: ['Hypoxemia progression', 'Respiratory acidosis', 'Bronchial mucus plugging', 'Diaphragm fatigue'],
    treatment: ['Nebulized salbutamol 2.5mg', 'Supplemental O2 at 4L/min', 'Peak flow monitoring q15min', 'IV corticosteroids if refractory'],
    logs: [
      'Telemetry stream integrity 99.6%',
      'Scanner: Re-evaluating... Chronic Asthma parameters...',
      'System Integrity: 99.8%',
      'Diagnostics: Bronchial resistance modeling active',
      'Status: Compromised pulmonary ventilation'
    ]
  },
  epilepsy: {
    name: 'Neurological Epilepsy',
    label: 'Tonic-Clonic Seizure — Neurological Emergency',
    status: 'CRISIS',
    color: 'text-fuchsia-500 border-fuchsia-500/30',
    hexColor: '#c040ff',
    bpm: 112,
    spo2: 92,
    resp: 24,
    glucose: 115,
    stress: 91,
    desc: 'Severe paroxysmal electrical discharge in cerebral cortex. Chaotic high-amplitude spike-and-wave EEG activity.',
    description: 'Generalized tonic-clonic seizure with chaotic spike-and-wave EEG discharges across all cortical regions.',
    riskFactors: ['Status epilepticus risk', 'Postictal hypoxia', 'Aspiration pneumonia', 'Traumatic injury from convulsions'],
    treatment: ['IV lorazepam 4mg bolus', 'Airway protection protocol', 'Continuous EEG monitoring', 'Phenytoin loading dose preparation'],
    logs: [
      'Telemetry stream integrity 99.6%',
      'Scanner: Re-evaluating... Neurological Epilepsy parameters...',
      'System Integrity: 99.8%',
      'Diagnostics: Cerebral cortex electrical discharges active',
      'Status: Critical neurological seizure alert'
    ]
  }
};

export const CONDITION_KEYS = Object.keys(CONDITIONS) as ConditionKey[];

export const CONDITION_LABELS: Record<ConditionKey, string> = {
  diabetes: '🧬 DIABETES',
  arrhythmia: '❤️ CARDIAC',
  asthma: '🫁 ASTHMA',
  epilepsy: '🧠 EPILEPSY'
};
