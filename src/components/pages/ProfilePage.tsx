import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Trophy, Flame, Calendar, Edit2, Save, X, LogOut,
  TrendingUp, Brain, BarChart3, Camera, Upload, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModeKey, modes } from '@/config/minimind';
import { AvatarCustomizer, AvatarWithFrame } from '@/components/AvatarCustomizer';

const displayNameSchema = z.string()
  .max(100, 'Display name must be less than 100 characters')
  .refine(val => val.length === 0 || val.trim().length > 0, 'Display name cannot be only whitespace')
  .refine(val => !/<[^>]*>/.test(val), 'Display name cannot contain HTML tags')
  .refine(val => !/javascript:/i.test(val), 'Invalid characters in display name');

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  unlocked?: boolean;
  unlocked_at?: string;
}

interface ProfilePageProps {
  onSignOut: () => void;
}

interface SkillArea {
  name: string;
  level: number;
  trend: 'up' | 'stable' | 'down';
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onSignOut }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [modeUsage, setModeUsage] = useState<Record<ModeKey, number>>({} as Record<ModeKey, number>);
  const [skillAreas, setSkillAreas] = useState<SkillArea[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState('default');
  const [presetAvatar, setPresetAvatar] = useState<string | null>(null);
  const [streakData, setStreakData] = useState({ currentStreak: 0 });

  useEffect(() => {
    fetchUserData();
    loadLocalStats();
    // Load saved avatar customization from localStorage
    const savedFrame = localStorage.getItem('minimind-avatar-frame');
    const savedPreset = localStorage.getItem('minimind-preset-avatar');
    if (savedFrame) setSelectedFrameId(savedFrame);
    if (savedPreset) setPresetAvatar(savedPreset);
  }, []);

  const loadLocalStats = () => {
    const savedHistory = localStorage.getItem('minimind-history');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        const usage: Record<ModeKey, number> = { beginner: 0, thinker: 0, story: 0, mastery: 0 };
        history.forEach((item: any) => {
          Object.keys(item.answers || {}).forEach((mode) => {
            usage[mode as ModeKey] = (usage[mode as ModeKey] || 0) + 1;
          });
        });
        setModeUsage(usage);
      } catch (e) {}
    }

    setSkillAreas([
      { name: 'Critical Thinking', level: 65, trend: 'up' },
      { name: 'Science & Nature', level: 45, trend: 'up' },
      { name: 'Technology', level: 55, trend: 'stable' },
      { name: 'History & Culture', level: 30, trend: 'up' },
    ]);
  };

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        setEditName(profileData.display_name || '');
        setAvatarUrl(profileData.avatar_url || null);
      }

      const { data: statsData } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (statsData) {
        setStatistics(statsData);
      }

      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (settingsData) {
        setSettings(settingsData);
      }

      const { data: allAchievements } = await supabase.from('achievements').select('*');
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id);

      if (allAchievements) {
        const achievementsWithStatus = allAchievements.map(achievement => ({
          ...achievement,
          unlocked: userAchievements?.some(ua => ua.achievement_id === achievement.id),
          unlocked_at: userAchievements?.find(ua => ua.achievement_id === achievement.id)?.unlocked_at
        }));
        setAchievements(achievementsWithStatus);
      }

      // Fetch streak data
      const { data: streakRow } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .single();
      if (streakRow) {
        setStreakData({ currentStreak: streakRow.current_streak });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    const validationResult = displayNameSchema.safeParse(editName);
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0]?.message || 'Invalid display name');
      return;
    }
    
    const sanitizedName = editName.trim();
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: sanitizedName })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({ ...profile, display_name: sanitizedName });
      setEditName(sanitizedName);
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleAvatarClick = () => {
    setShowAvatarCustomizer(true);
  };

  const handleSelectFrame = (frameId: string) => {
    setSelectedFrameId(frameId);
    localStorage.setItem('minimind-avatar-frame', frameId);
    toast.success('Frame updated!');
  };

  const handleSelectPresetAvatar = (emoji: string) => {
    setPresetAvatar(emoji);
    localStorage.setItem('minimind-preset-avatar', emoji);
    toast.success('Avatar updated!');
  };

  const handleUploadFromCustomizer = () => {
    setShowAvatarCustomizer(false);
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Create file path: user_id/avatar.ext
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists (ignore errors)
      await supabase.storage.from('avatars').remove([filePath]);

      // Upload new avatar to storage bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with the URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setProfile({ ...profile, avatar_url: publicUrl });
      // Clear preset avatar when uploading custom
      setPresetAvatar(null);
      localStorage.removeItem('minimind-preset-avatar');
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
      setAvatarUrl(profile?.avatar_url || null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (trend === 'down') return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
    return <div className="w-3 h-0.5 bg-muted-foreground" />;
  };

  const maxUsage = Math.max(...Object.values(modeUsage), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-heading font-bold mb-2">Not Signed In</h2>
        <p className="text-muted-foreground text-sm">Sign in to view your profile and track your progress.</p>
      </div>
    );
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const localStats = JSON.parse(localStorage.getItem('minimind-stats') || '{}');

  return (
    <div className="space-y-6 pb-24">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />

      {/* Avatar Customizer Modal */}
      <AvatarCustomizer
        isOpen={showAvatarCustomizer}
        onClose={() => setShowAvatarCustomizer(false)}
        currentAvatarUrl={avatarUrl}
        currentFrameId={selectedFrameId}
        currentPresetAvatar={presetAvatar}
        totalQuestions={statistics?.total_questions || 0}
        currentStreak={streakData.currentStreak}
        onSelectFrame={handleSelectFrame}
        onSelectPresetAvatar={handleSelectPresetAvatar}
        onUploadClick={handleUploadFromCustomizer}
      />

      {/* Profile Header */}
      <motion.div
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 p-6 border border-primary/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
        <div className="relative flex items-start gap-4">
          {/* Avatar with frame */}
          <div className="relative group">
            <button
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="relative"
            >
              <AvatarWithFrame
                avatarUrl={presetAvatar ? null : avatarUrl}
                presetAvatar={presetAvatar}
                frameId={selectedFrameId}
                size="md"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {isUploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
            </button>
          </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="Display name"
                />
                <motion.button
                  onClick={handleSaveProfile}
                  className="p-2 rounded-xl bg-primary text-primary-foreground"
                  whileTap={{ scale: 0.95 }}
                >
                  <Save className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-xl bg-muted"
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-heading font-bold text-foreground">{profile?.display_name || 'Learner'}</h2>
                <motion.button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            <button 
              onClick={() => setShowAvatarCustomizer(true)}
              className="text-xs text-primary font-medium mt-1.5 hover:underline"
            >
              Customize avatar & frame
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="progress" className="rounded-lg text-xs sm:text-sm">Progress</TabsTrigger>
          <TabsTrigger value="achievements" className="rounded-lg text-xs sm:text-sm">Badges</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
              <Flame className="w-6 h-6 text-amber-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{statistics?.current_streak || localStats.streak || 0}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
              <Brain className="w-6 h-6 text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{statistics?.total_questions || localStats.totalQuestions || 0}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
              <Calendar className="w-6 h-6 text-emerald-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{statistics?.questions_today || localStats.todayQuestions || 0}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
              <Trophy className="w-6 h-6 text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{unlockedCount}/{achievements.length}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </Card>
          </div>

          {/* Preferences */}
          <Card className="p-5 bg-card/80 backdrop-blur-sm border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-4">Preferences</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Theme</span>
                <span className="text-sm font-medium capitalize">{settings?.theme || 'System'}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Language</span>
                <span className="text-sm font-medium">{settings?.language || 'English'}</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-4 space-y-4">
          {/* Mode Usage */}
          <Card className="p-5 bg-card/80 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Mode Usage</h3>
            </div>
            <div className="space-y-4">
              {(Object.keys(modes) as ModeKey[]).map((modeKey) => {
                const usage = modeUsage[modeKey] || 0;
                const percentage = (usage / maxUsage) * 100;
                return (
                  <div key={modeKey} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{modes[modeKey].icon}</span>
                        <span className="font-medium text-foreground">{modes[modeKey].name}</span>
                      </span>
                      <span className="text-muted-foreground">{usage} uses</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Skills Growing */}
          <Card className="p-5 bg-card/80 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Skills Growing</h3>
              <span className="text-xs text-emerald-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Improving
              </span>
            </div>
            <div className="space-y-4">
              {skillAreas.map((skill) => (
                <div key={skill.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{skill.name}</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(skill.trend)}
                      <span className="text-xs text-muted-foreground">{skill.level}%</span>
                    </div>
                  </div>
                  <Progress value={skill.level} className="h-2" />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * index }}
              >
                <Card className={`p-4 ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/30'
                    : 'bg-card/50 border-border opacity-60'
                }`}>
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <h4 className={`font-semibold text-sm ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {achievement.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                  {achievement.unlocked && achievement.unlocked_at && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">
                      Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Sign Out */}
      <motion.button
        onClick={onSignOut}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors border border-destructive/20"
        whileTap={{ scale: 0.98 }}
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Sign Out</span>
      </motion.button>
    </div>
  );
};

export default ProfilePage;
