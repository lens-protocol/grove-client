/**
 * An error that occurs when a task violates a logical condition that is assumed to be true at all times.
 */
export class InvariantError extends Error {
	name = "InvariantError" as const;
}

/**
 * Asserts that the given condition is truthy
 * @internal
 *
 * @param condition - Either truthy or falsy value
 * @param message - An error message
 */
export function invariant(
	condition: unknown,
	message: string,
): asserts condition {
	if (!condition) {
		throw new InvariantError(message);
	}
}

/**
 * @internal
 */
export function never(message = "Unexpected call to never()"): never {
	throw new InvariantError(message);
}
