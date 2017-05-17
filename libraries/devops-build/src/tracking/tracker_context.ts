import { Tracker } from './tracker';
import { TrackerFactory } from './tracker_factory';

export class TrackerContext {
    factories: TrackerFactory[] = [];

    onTrackersCreated(factory: TrackerFactory) {
        console.log(`--created ${factory.constructor.name}`);
        this.factories.push(factory);
        for (let tracker of factory.trackers)
            this.enableLogging(tracker);
    }

    private enableLogging(tracker: Tracker) {
        tracker.started.subscribe(proc => console.log(`Started: ${tracker.description.name} (${tracker.description.description})`));
        tracker.progressed.subscribe(proc => console.log(`${tracker.description.name}: - ${typeof proc.progress === 'string' ? proc.progress : JSON.stringify(proc.progress)}`));
        tracker.succeeded.subscribe(proc => console.log(`Succeeded: ${tracker.description.name}`));
        tracker.failed.subscribe(proc => console.log(`Failed: ${tracker.description.name} - ${typeof proc.error === 'string' ? proc.error : proc.error instanceof Error ? proc.error.message : JSON.stringify(proc.error)}`));
        tracker.cancelling.subscribe(proc => console.log(`Cancelling: ${tracker.description.name}`));
        tracker.cancelled.subscribe(proc => console.log(`Cancelled: ${tracker.description.name}`));
    }

    /** Disposes factories in series in reverse order. */
    async disposeAsync() {
        for (let factory of this.factories.reverse()) {
            console.log(`--disposing ${factory.constructor.name}`);
            await factory.disposeAsync();
            console.log(`--disposed ${factory.constructor.name}`);
        }
    }
}