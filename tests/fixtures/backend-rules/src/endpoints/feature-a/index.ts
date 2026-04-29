import { router as sameFeatureRouter } from './subrouter';
import { router as otherFeatureRouter } from '../feature-b/index';

export const router = [sameFeatureRouter, otherFeatureRouter];
