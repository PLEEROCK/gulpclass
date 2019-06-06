import * as merge from "merge2";
import * as gulp from "gulp";
import {TaskMetadata} from "./TaskMetadata";
import {GulpclassMetadata} from "./GulpclassMetadata";

/**
 * Storages and registers all gulp classes and their tasks.
 */
export class MetadataStorage {

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    private gulpclassMetadatas: GulpclassMetadata[] = [];
    private taskMetadatas: TaskMetadata[] = [];

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    addGulpclassMetadata(metadata: GulpclassMetadata) {
        this.gulpclassMetadatas.push(metadata);
        this.taskMetadatas
            .filter(taskMetadata => taskMetadata.classConstructor === metadata.classConstructor)
            .forEach(taskMetadata => this.registerTasks(metadata, taskMetadata));
    }

    addTaskMetadata(metadata: TaskMetadata) {
        this.taskMetadatas.push(metadata);

        const gulpclassMetadata = this.gulpclassMetadatas.reduce<GulpclassMetadata | undefined>((found, m) => {
            return m.classConstructor === metadata.classConstructor ? m : found;
        }, undefined);
        if (gulpclassMetadata)
            this.registerTasks(gulpclassMetadata, metadata);
    }

    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------

    private registerTasks(gulpclassMetadata: GulpclassMetadata, taskMetadata: TaskMetadata) {
        if (!gulpclassMetadata.classInstance)
            gulpclassMetadata.classInstance = new (<any>gulpclassMetadata.classConstructor)();

        if (taskMetadata.dependencies && taskMetadata.dependencies.length) {
			const executeTask = (cb: Function) => {
                return this.executeTask(gulpclassMetadata, taskMetadata, cb);
            }
			gulpclassMetadata.gulpInstance.task(
				taskMetadata.name,
				taskMetadata.isParallelDepenencies
					? gulpclassMetadata.gulpInstance.series(gulpclassMetadata.gulpInstance.parallel(...taskMetadata.dependencies), executeTask)
					: gulpclassMetadata.gulpInstance.series(...taskMetadata.dependencies, executeTask)
			);
        } else {
            gulpclassMetadata.gulpInstance.task(taskMetadata.name, (cb: Function) => {
                return this.executeTask(gulpclassMetadata, taskMetadata, cb);
            });
        }
    }

    private executeTask(gulpclassMetadata: GulpclassMetadata, taskMetadata: TaskMetadata, cb: Function) {
        const methodResult = (<any>gulpclassMetadata.classInstance)[taskMetadata.method](cb);
        if (taskMetadata.isSequence && methodResult instanceof Array) {
            return gulpclassMetadata.gulpInstance.series.apply(this, methodResult)(cb);
        } else if (taskMetadata.isMerge && methodResult instanceof Array) {
            return merge.apply(this, methodResult);
        } else {
            return methodResult;
        }
    }

}

/**
 * Default metadata storage is used as singleton and can be used to storage all metadatas.
 */
export let defaultMetadataStorage = new MetadataStorage();
