import { ZaloBotApi } from './credentials/ZaloBotApi.credentials';
import { ZaloBot } from './nodes/ZaloBot/ZaloBot.node';
import { ZaloBotTrigger } from './nodes/ZaloBot/ZaloBotTrigger.node';

export const credentials = [ZaloBotApi];
export const nodes = [ZaloBot, ZaloBotTrigger];
