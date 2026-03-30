import React, { useState } from 'react';
import { GraduationCap, Users, FileSpreadsheet, Trophy, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';

const GuruDashboardPage: React.FC = () => {
  const { tier } = useSubscription();
  const isGuru = tier === 'pro'; // Guru mapped to pro tier for now

  if (!isGuru) {
    return (
      <div className="space-y-4 pb-24 max-w-lg mx-auto">
        <div className="text-center space-y-2 pt-8">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">MiniMind for Schools</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            The Guru Dashboard is available for Pro plan holders managing school or coaching center accounts.
          </p>
          <Button variant="outline" className="mt-4">
            Upgrade to Pro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      <div className="text-center space-y-1 pt-2">
        <div className="flex items-center justify-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-[var(--font-heading)]">Guru Dashboard</h1>
        </div>
        <p className="text-xs text-muted-foreground">Manage your students and classes</p>
      </div>

      {/* Seat Management */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          Seat Management
        </h2>
        <div className="flex gap-2">
          <Input placeholder="Student email" className="flex-1" />
          <Button size="sm">Add</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add students by email. They'll receive an invite to join your class.
        </p>
        <div className="text-center py-6 text-sm text-muted-foreground">
          No students added yet. Start by adding student emails above.
        </div>
      </Card>

      {/* Content Control */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4" />
          Content Control
        </h2>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Focus Subject</label>
          <Input placeholder="e.g., Physics, Biology" />
        </div>
        <p className="text-xs text-muted-foreground">
          Set a focus subject to guide all student learning this week.
        </p>
      </Card>

      {/* Reports */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4" />
          Progress Reports
        </h2>
        <Button variant="outline" size="sm" className="w-full">
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
          Export Weekly CSV Report
        </Button>
        <p className="text-xs text-muted-foreground">
          Export activity data for all students as a CSV spreadsheet.
        </p>
      </Card>

      {/* Class Challenges */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
          <Trophy className="w-4 h-4" />
          Class Challenges
        </h2>
        <Button variant="outline" size="sm" className="w-full">
          Create Custom Challenge
        </Button>
        <p className="text-xs text-muted-foreground">
          Create custom Arena challenges visible only to your students.
        </p>
      </Card>
    </div>
  );
};

export default GuruDashboardPage;
