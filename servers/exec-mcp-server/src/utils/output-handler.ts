/**
 * Output capture and truncation handler
 */

export class OutputCapture {
    private stdoutChunks: Buffer[] = [];
    private stderrChunks: Buffer[] = [];
    private stdoutBytes = 0;
    private stderrBytes = 0;
    private maxBytes: number;
    private stdoutTruncated = false;
    private stderrTruncated = false;

    constructor(maxBytes: number) {
        this.maxBytes = maxBytes;
    }

    /**
     * Capture stdout chunk
     */
    captureStdout(chunk: Buffer): void {
        const chunkSize = chunk.length;

        if (this.stdoutBytes + chunkSize <= this.maxBytes) {
            this.stdoutChunks.push(chunk);
            this.stdoutBytes += chunkSize;
        } else if (!this.stdoutTruncated) {
            // Add what we can
            const remainingSpace = this.maxBytes - this.stdoutBytes;
            if (remainingSpace > 0) {
                this.stdoutChunks.push(chunk.subarray(0, remainingSpace));
                this.stdoutBytes += remainingSpace;
            }
            this.stdoutTruncated = true;
        }
    }

    /**
     * Capture stderr chunk
     */
    captureStderr(chunk: Buffer): void {
        const chunkSize = chunk.length;

        if (this.stderrBytes + chunkSize <= this.maxBytes) {
            this.stderrChunks.push(chunk);
            this.stderrBytes += chunkSize;
        } else if (!this.stderrTruncated) {
            // Add what we can
            const remainingSpace = this.maxBytes - this.stderrBytes;
            if (remainingSpace > 0) {
                this.stderrChunks.push(chunk.subarray(0, remainingSpace));
                this.stderrBytes += remainingSpace;
            }
            this.stderrTruncated = true;
        }
    }

    /**
     * Get captured output
     */
    getResult(): {
        stdout: string;
        stderr: string;
        truncated: boolean;
    } {
        let stdout = Buffer.concat(this.stdoutChunks).toString('utf-8');
        let stderr = Buffer.concat(this.stderrChunks).toString('utf-8');

        // Add truncation markers
        if (this.stdoutTruncated) {
            stdout += '\n\n[OUTPUT TRUNCATED - exceeded maximum size]';
        }
        if (this.stderrTruncated) {
            stderr += '\n\n[OUTPUT TRUNCATED - exceeded maximum size]';
        }

        return {
            stdout,
            stderr,
            truncated: this.stdoutTruncated || this.stderrTruncated
        };
    }

    /**
     * Get current sizes
     */
    getSizes(): { stdout: number; stderr: number } {
        return {
            stdout: this.stdoutBytes,
            stderr: this.stderrBytes
        };
    }
}
