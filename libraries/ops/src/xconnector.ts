import { Stateful } from './transitions/stateful';
import { Connection } from './connection';
import { Interface } from './interface';
import { Transitive } from './transitions/transitive';
import { DynamicMerge } from './transitions/dynamic_merge';
import { Connectable, ConnectableInput, ConnectableResult } from './connectable';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/never';
import 'rxjs/add/operator/filter';

export abstract class Connector<TEvent = any> extends Connectable<TEvent> {
    constructor(public parent?: Interface | Connection) {
        super(new Stateful<ConnectableInput, ConnectableResult>());
        this.dynamicMerge = new DynamicMerge<Connectable<TEvent>, TEvent>();
        let neverObservable = Observable.never();
        this.dynamicMerge.set(this, neverObservable);
    }

    protected dynamicMerge: DynamicMerge<Connectable<TEvent>, TEvent>;
    protected connections = new Map<Connectable<TEvent>, boolean>();



    protected async createConnectPromise(connectable: Connectable<TEvent>, input: ConnectableInput): Promise<ConnectableResult> {
        this.connections.set(connectable, false);
        if (this.connections.has(connectable))
            throw new Error('Connectable already attached.');
        let result = await super.createConnectPromise(connectable, input);
        this.dynamicMerge.set(connectable, connectable.observable);
        this.connections.set(connectable, true);
        return result;
    }

    protected async createDisonnectPromise(connectable: Connectable<TEvent>, input: ConnectableInput): Promise<ConnectableResult> {
        let wasConnected = this.connections.get(connectable);
        if (!disposal)
            throw new Error('Connectable not attached.');
        let result = await super.createDisonnectPromise(connectable, input);
        this.dynamicMerge.set(connectable, connectable.observable);
        this.connections.set(connectable, true);
        return result;
    }

    async disconnectAsync(connectable: Connectable<TEvent>): Promise<void> {
        let disposal = this.connections.get(connectable);
        if (!disposal)
            throw new Error('Connectable not attached.');

        if (this.connections.has(connectable))
            throw new Error('Connectable already attached.');
        this.connections.set(connectable, false);
        if (!await super.connectAsync(connectable))
            return false;
        this.dynamicMerge.set(connectable, connectable.observable);
        this.connections.set(connectable, true);
        return true;
    }

    protected async onDisconnectAsync(connectable: Connectable<TEvent>): Promise<void> {
        return true;
    }






    connect(connectable: Connectable<TEvent>, connectTransition: Transitive<void, boolean>) {
        if (this.connections.has(connectable))
            throw new Error('Connectable already attached.');
        let transitioningSubscription = connectTransition.transitioning.subscribe(() => this.dynamicMerge.delete(connectable)); // If it reenters transitioning, ensure its deleted
        let transitionedSubscription = connectTransition.transitioned.subscribe(() => this.dynamicMerge.set(connectable, connectable.observable)); // Only add after fully connected
        let disposal = () => {
            this.dynamicMerge.delete(connectable);
            transitioningSubscription.unsubscribe();
            transitionedSubscription.unsubscribe();
        };
        this.connections.set(connectable, disposal);
        super.connect(connectable, connectTransition);
    }

    disconnect(connectable: Connectable<TEvent>, disconnectTransition: Transitive<void, boolean>) {
        let disposal = this.connections.get(connectable);
        if (!disposal)
            throw new Error('Connectable not attached.');
        let transitioningSubscription = disconnectTransition.transitioning.subscribe(() => this.dynamicMerge.delete(connectable)); // Immediately remove it from participation in the observable.
        let transitionedSubscription = disconnectTransition.transitioned.subscribe(() => this.dynamicMerge.set(connectable, connectable.observable)); // Only add after fully connected
        let disposal = () => {
            this.dynamicMerge.delete(connectable);
            transitioningSubscription.unsubscribe();
            transitionedSubscription.unsubscribe();
        };
        this.connections.set(connectable, disposal);
        super.connect(connectable, connectTransition);



        disposal();
        super.disconnect(connectable, disconnectTransition);
    }

    dispose() {
        for (let disposal of this.connections.values())
            disposal();
        this.connections.clear();
        this.dynamicMerge.dispose();
        super.dispose();
    }
}

export class InputConnector<TEvent = any> extends Connector<TEvent> {
    constructor(parent?: Interface | Connection) {
        super(parent);
    }

    get observable(): Observable<TEvent> { return this.dynamicMerge.observable; }
}

export class OutputConnector<TEvent = any> extends Connector<TEvent> {
    constructor(public observable: Observable<TEvent>, parent: Interface | Connection) {
        super(parent);
    }
}
