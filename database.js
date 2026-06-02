import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SKILLS, DEFAULT_PRIORITY_SKILLS, REQUIRED_HOURS } from './theme';

const KEYS = {
  LOGS: 'dl_logs',
  SETTINGS: 'dl_settings',
  JOURNEY: 'dl_journey',
  STATS: 'dl_stats',
};

// ─── Default data ────────────────────────────────────────────────────────────

const defaultSettings = () => ({
  driverName: '',
  state: 'Virginia',
  requiredTotal: REQUIRED_HOURS.total,
  requiredNight: REQUIRED_HOURS.night, // 15 for Virginia
  prioritySkills: [...DEFAULT_PRIORITY_SKILLS],
  customSkills: [],
  currency: '$',
});

const defaultStats = () => ({
  totalHours: 0,
  nightHours: 0,
});

const defaultJourney = () => ([
  {
    id: 'permit',
    title: 'Get learner permit',
    sub: 'Pass written knowledge test at the DMV',
    icon: 'document-text-outline',
    status: 'active',
    substeps: [
      { text: 'Study the driver handbook', done: false },
      { text: 'Schedule knowledge test at DMV', done: false },
      { text: 'Bring ID documents (birth certificate, proof of residence)', done: false },
      { text: 'Pass the written test (70% or above)', done: false },
      { text: 'Pay permit fee', done: false },
      { text: 'Receive learner permit card', done: false },
    ],
  },
  {
    id: 'hours',
    title: 'Log required practice hours',
    sub: 'Complete supervised driving hours including nighttime',
    icon: 'time-outline',
    status: 'active',
    substeps: [
      { text: 'Log first 10 daytime hours', done: false },
      { text: 'Log 20 total hours', done: false },
      { text: 'Log 35 total hours', done: false },
      { text: 'Log 45 total hours', done: false },
      { text: 'Log 15 nighttime hours', done: false },
    ],
    autoTracked: true,
  },
  {
    id: 'drivers-ed',
    title: 'Complete driver education',
    sub: 'Classroom course + in-car lessons with an instructor',
    icon: 'school-outline',
    status: 'not_started',
    substeps: [
      { text: 'Research & choose a classroom program', done: false, hasNote: true, noteKey: 'classroom_program', notePlaceholder: 'Program name, location, contact info…' },
      { text: 'Sign up for classroom program', done: false },
      { text: 'Complete classroom sessions', done: false },
      { text: 'Research & choose an in-car instructor or program', done: false, hasNote: true, noteKey: 'incar_program', notePlaceholder: 'Instructor name, school, contact info…' },
      { text: 'Sign up for in-car lessons', done: false },
      { text: 'Complete in-car lessons with instructor', done: false },
      { text: 'Receive completion certificate', done: false },
    ],
  },
  {
    id: 'vision',
    title: 'Pass vision screening',
    sub: 'Eye test required before road test',
    icon: 'eye-outline',
    status: 'not_started',
    substeps: [
      { text: 'Schedule eye exam or visit DMV for screening', done: false },
      { text: 'Obtain glasses/contacts prescription if needed', done: false },
      { text: 'Pass DMV vision screening', done: false },
    ],
  },
  {
    id: 'test-signup',
    title: 'Schedule the road test',
    sub: 'Book driving exam once all hours are complete',
    icon: 'calendar-outline',
    status: 'not_started',
    substeps: [
      { text: 'Confirm all required hours are logged', done: false },
      { text: 'Visit DMV website and schedule road test', done: false },
      { text: 'Get parent/guardian signature on application form', done: false },
      { text: 'Confirm test date, time, and location', done: false },
      { text: 'Arrange a vehicle for the test day', done: false },
    ],
  },
  {
    id: 'road-test',
    title: 'Pass the road test',
    sub: 'Behind-the-wheel exam with a DMV examiner',
    icon: 'car-outline',
    status: 'not_started',
    substeps: [
      { text: 'Gather required documents (permit, insurance, registration)', done: false },
      { text: 'Arrive 15 minutes early', done: false },
      { text: 'Pass pre-drive vehicle safety check', done: false },
      { text: 'Complete the road test route', done: false },
      { text: 'Score 70% or above to pass', done: false },
    ],
  },
  {
    id: 'license',
    title: 'Get your license!',
    sub: "Receive your provisional or full driver's license",
    icon: 'ribbon-outline',
    status: 'not_started',
    substeps: [
      { text: 'Pay licensing fee at the DMV counter', done: false },
      { text: 'Have photo taken for license card', done: false },
      { text: 'Receive temporary paper license', done: false },
      { text: 'Wait for permanent license card in the mail', done: false },
      { text: "🎉 You're a licensed driver!", done: false },
    ],
  },
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const save = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const load = async (key) => {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const getSettings = async () => {
  const saved = await load(KEYS.SETTINGS);
  return saved ? { ...defaultSettings(), ...saved } : defaultSettings();
};

export const saveSettings = async (settings) => {
  await save(KEYS.SETTINGS, settings);
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getStats = async () => {
  const saved = await load(KEYS.STATS);
  return saved ? { ...defaultStats(), ...saved } : defaultStats();
};

export const saveStats = async (stats) => {
  await save(KEYS.STATS, stats);
};

// ─── Drive Logs ───────────────────────────────────────────────────────────────

export const getLogs = async () => {
  const saved = await load(KEYS.LOGS);
  return saved || [];
};

export const addLog = async (entry) => {
  const logs = await getLogs();
  const newLog = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...entry };
  const updated = [newLog, ...logs];
  await save(KEYS.LOGS, updated);
  return updated;
};

export const deleteLog = async (id) => {
  const logs = await getLogs();
  const updated = logs.filter(l => l.id !== id);
  await save(KEYS.LOGS, updated);
  return updated;
};

// ─── Journey ──────────────────────────────────────────────────────────────────

export const getJourney = async () => {
  const saved = await load(KEYS.JOURNEY);
  return saved || defaultJourney();
};

export const saveJourney = async (journey) => {
  await save(KEYS.JOURNEY, journey);
};

export const toggleSubstep = async (stepId, substepIndex) => {
  const journey = await getJourney();
  const step = journey.find(s => s.id === stepId);
  if (!step || step.autoTracked) return journey;
  step.substeps[substepIndex].done = !step.substeps[substepIndex].done;
  const allDone = step.substeps.every(s => s.done);
  step.status = allDone ? 'done' : step.status === 'not_started' ? 'active' : step.status;
  await save(KEYS.JOURNEY, journey);
  return journey;
};

export const saveSubstepNote = async (stepId, noteKey, noteValue) => {
  const journey = await getJourney();
  const step = journey.find(s => s.id === stepId);
  if (!step) return journey;
  if (!step.notes) step.notes = {};
  step.notes[noteKey] = noteValue;
  await save(KEYS.JOURNEY, journey);
  return journey;
};

// Sync the 'hours' step substeps based on current stats and user-configured requirements
export const syncHoursStep = async (totalHours, nightHours, requiredNight = 15) => {
  const journey = await getJourney();
  const step = journey.find(s => s.id === 'hours');
  if (!step) return journey;
  const milestones = [10, 20, 35, 45];
  milestones.forEach((m, i) => {
    step.substeps[i].done = totalHours >= m;
  });
  step.substeps[4].done = nightHours >= requiredNight;
  const allDone = step.substeps.every(s => s.done);
  step.status = allDone ? 'done' : 'active';
  await save(KEYS.JOURNEY, journey);
  return journey;
};

// ─── Seed / Reset ─────────────────────────────────────────────────────────────

export const isFirstLaunch = async () => {
  const val = await AsyncStorage.getItem('dl_launched');
  return val === null;
};

export const markLaunched = async () => {
  await AsyncStorage.setItem('dl_launched', '1');
};

export const clearAll = async () => {
  await AsyncStorage.multiRemove([KEYS.LOGS, KEYS.SETTINGS, KEYS.JOURNEY, KEYS.STATS, 'dl_launched']);
};
