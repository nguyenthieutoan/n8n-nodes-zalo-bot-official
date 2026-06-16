import { ZaloBotApi } from './credentials/ZaloBotApi.credentials';
import { ZaloBot } from './nodes/ZaloBot/ZaloBot.node';
import { ZaloBotTrigger } from './nodes/ZaloBotTrigger/ZaloBotTrigger.node';

export const credentials = [ZaloBotApi];
export const nodes = [ZaloBot, ZaloBotTrigger];
