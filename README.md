# deno-latency-comparator
A real-time latency comparator written in Deno.

The latency comparator always compares the latency between two SUTs. It allocates workers & then start hitting the services. It continuously measures the latency & reports mean latency for both the services.

## Inputs
The latency comparator takes the following inputs:
- name1=URL1: The name of the first SUT along with the URL
- name2=URL2: The name of the second SUT along with the URL
- -m: The HTTP method
- -c: The number of concurrent connections per SUT
- -j: The JSON body to send (must be stringified)
- -f: The path of the file to upload
- -d: A semi-colon separated string of key-value pairs that would be sent as multipart/form-data

The SUT name shouldn't exceed five characters.

## Outputs
The latency comparator always produces output on the console. A rolling mean of latency for both SUTs is produced. The readings are colored with green (lower latency) and red (higher latency).

## Examples

![](https://github.com/mayankchoubey/deno-latency-comparator/blob/77a47563263bfd0db7aea3b405c29188edd42176/Screen%20Shot%202021-06-28%20at%208.07.44%20PM.png)
![](https://github.com/mayankchoubey/deno-latency-comparator/blob/77a47563263bfd0db7aea3b405c29188edd42176/Screen%20Shot%202021-06-28%20at%208.09.00%20PM.png)
