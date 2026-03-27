import React from 'react';
import { type LucideProps } from 'lucide-react';
import { Card } from '../ui/card';

interface EmptyStateProps {
  Icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
  title: string;
  description: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ Icon, title, description }) => {
  return (
    <Card className="flex items-center justify-center p-12 border-dashed">
      <div className="text-center">
        <div className="flex justify-center mb-4">
            <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
    </Card>
  );
};

export default EmptyState;
