'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Zap, 
  Star, 
  Trophy, 
  Gift, 
  X,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface XPNotificationProps {
  xpEarned: number;
  totalXP: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
  }>;
  onClose: () => void;
  show: boolean;
}

export default function XPNotification({
  xpEarned,
  totalXP,
  levelBefore,
  levelAfter,
  leveledUp,
  achievements = [],
  onClose,
  show
}: XPNotificationProps) {
  const [currentStep, setCurrentStep] = useState<'xp' | 'levelup' | 'achievements'>('xp');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (show) {
      setCurrentStep('xp');
      
      // Auto-progress through notifications
      const timer1 = setTimeout(() => {
        if (leveledUp) {
          setCurrentStep('levelup');
          setShowConfetti(true);
        } else if (achievements.length > 0) {
          setCurrentStep('achievements');
        }
      }, 2000);

      const timer2 = setTimeout(() => {
        if (leveledUp && achievements.length > 0) {
          setCurrentStep('achievements');
        }
      }, 4000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [show, leveledUp, achievements.length]);

  const handleClose = () => {
    setShowConfetti(false);
    onClose();
  };

  const getXPColor = (xp: number) => {
    if (xp >= 100) return 'text-purple-600';
    if (xp >= 50) return 'text-blue-600';
    if (xp >= 25) return 'text-green-600';
    return 'text-gray-600';
  };

  const getXPAnimation = (xp: number) => {
    if (xp >= 100) return 'animate-bounce';
    if (xp >= 50) return 'animate-pulse';
    return '';
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Confetti Effect */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-50">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: -10,
                    rotate: 0,
                  }}
                  animate={{
                    y: window.innerHeight + 10,
                    rotate: 360,
                  }}
                  transition={{
                    duration: Math.random() * 2 + 1,
                    delay: Math.random() * 0.5,
                  }}
                />
              ))}
            </div>
          )}

          {/* Notification Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              {/* XP Notification */}
              {currentStep === 'xp' && (
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50" />
                  <CardContent className="relative p-6 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="mb-4"
                    >
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 ${getXPAnimation(xpEarned)}`}>
                        <Zap className={`h-8 w-8 ${getXPColor(xpEarned)}`} />
                      </div>
                    </motion.div>

                    <motion.h3
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-bold mb-2"
                    >
                      +{xpEarned} XP Earned!
                    </motion.h3>

                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-gray-600 mb-4"
                    >
                      Total XP: {totalXP.toLocaleString()}
                    </motion.p>

                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Badge variant="secondary" className="text-lg px-4 py-2">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Great Progress!
                      </Badge>
                    </motion.div>
                  </CardContent>
                </Card>
              )}

              {/* Level Up Notification */}
              {currentStep === 'levelup' && leveledUp && (
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50" />
                  <CardContent className="relative p-6 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="mb-4"
                    >
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse">
                        <Star className="h-10 w-10 text-white" />
                      </div>
                    </motion.div>

                    <motion.h2
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent"
                    >
                      LEVEL UP!
                    </motion.h2>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center justify-center space-x-4 mb-4"
                    >
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Level {levelBefore}
                      </Badge>
                      <Sparkles className="h-6 w-6 text-yellow-500" />
                      <Badge variant="default" className="text-lg px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500">
                        Level {levelAfter}
                      </Badge>
                    </motion.div>

                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-gray-600 mb-4"
                    >
                      Congratulations! You've reached Level {levelAfter}!
                    </motion.p>

                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Badge variant="secondary" className="text-base px-4 py-2">
                        <Gift className="h-4 w-4 mr-2" />
                        New features unlocked!
                      </Badge>
                    </motion.div>
                  </CardContent>
                </Card>
              )}

              {/* Achievement Notifications */}
              {currentStep === 'achievements' && achievements.length > 0 && (
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50" />
                  <CardContent className="relative p-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-center mb-4"
                    >
                      <Trophy className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                      <h3 className="text-xl font-bold">
                        Achievement{achievements.length > 1 ? 's' : ''} Unlocked!
                      </h3>
                    </motion.div>

                    <div className="space-y-3">
                      {achievements.map((achievement, index) => (
                        <motion.div
                          key={achievement.id}
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.2 }}
                          className="flex items-center space-x-3 p-3 bg-white rounded-lg border"
                        >
                          <div className="text-2xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{achievement.title}</h4>
                            <p className="text-sm text-gray-600">{achievement.description}</p>
                          </div>
                          <Badge variant="secondary">
                            +{achievement.xpReward} XP
                          </Badge>
                        </motion.div>
                      ))}
                    </div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: achievements.length * 0.2 + 0.3 }}
                      className="text-center mt-4"
                    >
                      <Button onClick={handleClose} className="w-full">
                        Awesome! Continue Learning
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}