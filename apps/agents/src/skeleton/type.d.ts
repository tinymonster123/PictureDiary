export type SkeletonJson = {
    scenes: string[],
    characters: {
        name: string;
        description: string
    }[],
    objects: string[],
    setting: string,
};