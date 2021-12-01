import chromeFactory from '@/services/chrome';
import DrupalOrg from '@/services/drupal-org';

export interface ServiceInterface<T> {
  name: string;
  dependencies: string[];
  type: 'Function' | 'Class';
  prototype: T;
}

export interface ServiceContainerInterface {
  services: ServiceInterface<any>[];
  create<T>(callback: (...args: any[]) => T, ...args: any[]): T;
  createInstance<T>(Type: (new (...args: any[]) => T), ...args: any[]): T;
  find(name: string): ServiceInterface<any> | null;
  get(name: string): any;
  register<T>(data: ServiceInterface<T>): void;
}

const serviceContainer: ServiceContainerInterface = {
  services: [
    {
      name: 'chrome',
      dependencies: [],
      type: 'Function',
      prototype: chromeFactory,
    },
    {
      name: 'drupal',
      dependencies: ['chrome'],
      type: 'Class',
      prototype: DrupalOrg,
    },
  ],
  create<T>(callback: (...args: any[]) => T, ...args: any[]): T {
    return <T> callback(...args);
  },
  createInstance<T>(Type: (new (...args: any[]) => T), ...args: any[]): T {
    const instance = Object.create(Type.prototype);
    instance.constructor(...args);
    return <T> instance;
  },
  find<T>(name: string): ServiceInterface<T> | null {
    return this.services.find((s) => s.name === name) as ServiceInterface<T> || null;
  },
  get<T>(name: string): T {
    const service = this.find(name);
    if (service) {
      const deps = service.dependencies.map((depName) => this.get(depName));

      if (service.type === 'Function') {
        return this.create<T>(service.prototype, ...deps);
      }
      return this.createInstance<T>(service.prototype, ...deps);
    }
    throw new Error(`${name} not found`);
  },
  register<T>(data: ServiceInterface<T>): void {
    this.services = this.services.concat(data);
  },
};

export default serviceContainer;
