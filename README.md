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

deno run -q --allow-read --allow-net --allow-hrtime --unstable app.ts deno=http://localhost:3000 node=http://localhost:4000 -f ./testdata/sample.pdf  -c 5
Initializing 5 workers ....
Initialized 5 workers ....

5 concurrent connections, method POST

28503 ms   DENO lat=3.421ms for reqs=728     NODE lat=5.481ms for reqs=727
