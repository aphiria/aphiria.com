import * as digitalocean from "@pulumi/digitalocean";
import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export function createNetworking(kubeProvider: kubernetes.Provider) {
    // Get the load balancer service to extract its IP
    const loadBalancer = kubernetes.core.v1.Service.get(
        "load-balancer",
        "nginx-gateway/nginx-gateway-nginx-gateway-fabric",
        { provider: kubeProvider }
    );

    const loadBalancerIp = pulumi.output(loadBalancer.status).apply(
        async (status) => status?.loadBalancer?.ingress?.[0]?.ip || ""
    );

    const domain = new digitalocean.Domain("default", {
        name: "aphiria.com",
    }, {
        protect: true,
    });

    const aRecord = new digitalocean.DnsRecord("a", {
        domain: domain.id,
        type: digitalocean.RecordType.A,
        name: "@",
        value: loadBalancerIp,
        ttl: 3600,
    }, {
        protect: true,
    });

    const apiARecord = new digitalocean.DnsRecord("api-a", {
        domain: domain.id,
        type: digitalocean.RecordType.A,
        name: "api",
        value: loadBalancerIp,
        ttl: 3600,
    }, {
        protect: true,
    });

    const wwwCname = new digitalocean.DnsRecord("www-cname", {
        domain: domain.id,
        type: digitalocean.RecordType.CNAME,
        name: "www",
        value: "@",
        ttl: 43200,
    }, {
        protect: true,
    });

    const mxDefault = new digitalocean.DnsRecord("mx-default", {
        domain: domain.id,
        type: digitalocean.RecordType.MX,
        name: "@",
        priority: 1,
        value: "aspmx.l.google.com.",
        ttl: 1800,
    }, {
        protect: true,
    });

    const mx1 = new digitalocean.DnsRecord("mx-1", {
        domain: domain.id,
        type: digitalocean.RecordType.MX,
        name: "@",
        priority: 5,
        value: "alt1.aspmx.l.google.com.",
        ttl: 1800,
    }, {
        protect: true,
    });

    const mx2 = new digitalocean.DnsRecord("mx-2", {
        domain: domain.id,
        type: digitalocean.RecordType.MX,
        name: "@",
        priority: 5,
        value: "alt2.aspmx.l.google.com.",
        ttl: 1800,
    }, {
        protect: true,
    });

    const mx3 = new digitalocean.DnsRecord("mx-3", {
        domain: domain.id,
        type: digitalocean.RecordType.MX,
        name: "@",
        priority: 10,
        value: "alt3.aspmx.l.google.com.",
        ttl: 1800,
    }, {
        protect: true,
    });

    const mx4 = new digitalocean.DnsRecord("mx-4", {
        domain: domain.id,
        type: digitalocean.RecordType.MX,
        name: "@",
        priority: 10,
        value: "alt4.aspmx.l.google.com.",
        ttl: 1800,
    }, {
        protect: true,
    });

    const ns1 = new digitalocean.DnsRecord("ns-1", {
        domain: domain.id,
        type: digitalocean.RecordType.NS,
        name: "@",
        value: "ns1.digitalocean.com.",
        ttl: 1800,
    }, {
        protect: true,
    });

    const ns2 = new digitalocean.DnsRecord("ns-2", {
        domain: domain.id,
        type: digitalocean.RecordType.NS,
        name: "@",
        value: "ns2.digitalocean.com.",
        ttl: 1800,
    }, {
        protect: true,
    });

    const ns3 = new digitalocean.DnsRecord("ns-3", {
        domain: domain.id,
        type: digitalocean.RecordType.NS,
        name: "@",
        value: "ns3.digitalocean.com.",
        ttl: 1800,
    }, {
        protect: true,
    });

    return {
        domain,
        aRecord,
        apiARecord,
        wwwCname,
        mxDefault,
        mx1,
        mx2,
        mx3,
        mx4,
        ns1,
        ns2,
        ns3,
    };
}
