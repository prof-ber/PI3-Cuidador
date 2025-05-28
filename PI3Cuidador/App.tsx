import React from 'react';
import Checklist from './lib/checklist';
import ConfigureAlarmButton from './lib/alarme';
import DailyAgenda from './lib/agenda';

export default function App() {
  return (
    <>
      <Checklist />
      <DailyAgenda />
      <ConfigureAlarmButton />
    </>
  );
}
