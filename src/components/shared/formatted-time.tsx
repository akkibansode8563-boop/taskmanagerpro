"use client";

import React, { useState, useEffect } from 'react';
import { formatTime } from '@/lib/utils';

interface FormattedTimeProps {
  date: string | number | Date;
}

const FormattedTime: React.FC<FormattedTimeProps> = ({ date }) => {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    setFormattedDate(formatTime(date));
  }, [date]);

  if (!formattedDate) {
    return null; // Or a placeholder
  }

  return <span>{formattedDate}</span>;
};

export default FormattedTime;
