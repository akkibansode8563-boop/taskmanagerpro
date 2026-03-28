"use client";

import React, { useEffect, useState } from 'react';

interface GreetingProps {
  userName: string;
}

const Greeting: React.FC<GreetingProps> = ({ userName }) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good Morning';
      if (hour < 18) return 'Good Afternoon';
      return 'Good Evening';
    };
    setGreeting(getGreeting());
  }, []);

  const greetingText = `${greeting}, ${userName}!`;

  return (
    <h1 className="text-2xl font-bold tracking-tighter animate-fade-in-up sm:text-3xl md:text-4xl">
      {greetingText}
    </h1>
  );
};

export default Greeting;
