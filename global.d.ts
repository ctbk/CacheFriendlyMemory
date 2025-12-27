export {};

import '../../../../public/global';
import '../../../../global';

declare global {
    interface Window {
        cacheFriendlyMemory?: {
            init: () => void;
            getChatStorage: () => any;
            performCompaction: () => Promise<void>;
            getStatus: () => any;
        };
    }
}
