import {Suspense, useState} from 'preact/compat';
import {signal} from '@preact/signals';

class Deferred<T> {
  public readonly promise: Promise<T> & {
    status?: 'resolved' | 'rejected';
    value?: T;
    reason?: any;
  };
  public resolve!: (value: T) => void;
  public reject!: (reason: any) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (value) => {
        Object.assign(this.promise, {status: 'resolved', value});
        resolve(value);
      };
      this.reject = (reason) => {
        Object.assign(this.promise, {status: 'rejected', reason});
        reject(reason);
      };
    });
  }
}

const deferredModule = new Deferred<typeof import('./Async.tsx')>();
const moduleSignal = signal({deferred: deferredModule});

export function App() {
  const [rendered, setRendered] = useState(false);

  return (
    <>
      {rendered && <AsyncComponentWithSuspense />}
      <button
        id="render"
        onClick={() => {
          setRendered(true);
        }}
      >
        Render Async Component
      </button>
      <button
        id="load"
        onClick={async () => {
          if (deferredModule.promise.status === 'resolved') return;
          moduleSignal.value = {deferred: deferredModule};

          const module = await import('./Async.tsx');
          deferredModule.resolve(module);
        }}
      >
        Load Async Component
      </button>
    </>
  );
}

const loading = <div id="loading">Loading...</div>;

function AsyncComponentWithSuspense() {
  return (
    <Suspense fallback={loading}>
      <AsyncComponent />
    </Suspense>
  );
}

function AsyncComponent() {
  const promise = moduleSignal.value.deferred.promise;

  console.log(promise);

  switch (promise.status) {
    case 'resolved': {
      const {Async} = promise.value!;
      return <Async />;
    }
    case 'rejected': {
      throw promise.reason;
    }
    default: {
      throw promise;
    }
  }
}
