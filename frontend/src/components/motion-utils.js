import { motion } from 'framer-motion';

export const CardMotion = ({ children, index = 0, ...props }) => {
  const stagger = 40;
  const delay = (index * stagger) / 1000;
  return (
    <motion.div
      initial={{ y: 40, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.32, ease: [0.2, 0.9, 0.3, 1], delay }}
      style={{ willChange: 'transform, opacity' }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
